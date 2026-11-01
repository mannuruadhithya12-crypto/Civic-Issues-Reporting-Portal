/**
 * server/scripts/evaluateDuplicateIntelligence.js
 * Benchmark evaluation script comparing pure deterministic heuristic baseline
 * vs. hybrid Gemini semantic duplicate detection.
 * Computes Precision, Recall, F1 Score, False-Positive Rate (FPR), Latency, and Token Consumption.
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Issue = require('../models/Issue');
const User = require('../models/User');
const { findDuplicateCandidates } = require('../services/duplicateMatchingEngine');
const benchmarkDataset = require('../data/duplicateBenchmarkDataset.json');

async function evaluateMode({ enableSemantic = true, testUser }) {
  const results = {
    tp: 0,
    fp: 0,
    tn: 0,
    fn: 0,
    totalScenarios: benchmarkDataset.length,
    totalCandidatePairs: 0,
    latencies: [],
    tokens: 0,
    predictions: []
  };

  for (const scenario of benchmarkDataset) {
    // Clear issues for clean scenario evaluation
    await Issue.deleteMany({});

    // Populate candidate issues in database
    const dbCandidatesMap = new Map();
    for (const cand of scenario.candidates) {
      if (cand.latitude !== null && cand.longitude !== null) {
        const doc = await Issue.create({
          title: cand.title,
          description: cand.description,
          department: cand.department,
          location: cand.title || 'Bengaluru, India',
          locationName: cand.title || 'Bengaluru, India',
          coordinates: {
            type: 'Point',
            coordinates: [cand.longitude, cand.latitude]
          },
          status: 'reported',
          priority: 'normal',
          createdBy: testUser._id
        });
        dbCandidatesMap.set(cand.id, doc);
      }
    }

    // Evaluate target issue
    const startMs = Date.now();
    const target = scenario.target;

    let evalResult;
    try {
      evalResult = await findDuplicateCandidates({
        latitude: target.latitude,
        longitude: target.longitude,
        title: target.title,
        description: target.description,
        department: target.department,
        radiusMeters: 300,
        enableSemantic
      });
    } catch (err) {
      evalResult = { success: false, candidates: [], error: err.message };
    }

    const duration = Date.now() - startMs;
    results.latencies.push(duration);

    // Evaluate predictions against ground truth
    for (const cand of scenario.candidates) {
      results.totalCandidatePairs++;
      const truth = scenario.groundTruth[cand.id];
      const isActuallyDuplicate = truth ? truth.isDuplicate : false;

      const dbDoc = dbCandidatesMap.get(cand.id);
      const evaluatedCand = evalResult.candidates?.find(
        c => String(c.issueId) === String(dbDoc?._id)
      );

      const predictedDuplicate = evaluatedCand
        ? evaluatedCand.similarityScore >= (evalResult.threshold || 0.60)
        : false;

      if (predictedDuplicate && isActuallyDuplicate) {
        results.tp++;
      } else if (predictedDuplicate && !isActuallyDuplicate) {
        results.fp++;
      } else if (!predictedDuplicate && !isActuallyDuplicate) {
        results.tn++;
      } else if (!predictedDuplicate && isActuallyDuplicate) {
        results.fn++;
      }

      results.predictions.push({
        scenarioId: scenario.id,
        candidateId: cand.id,
        isActuallyDuplicate,
        predictedDuplicate,
        score: evaluatedCand ? evaluatedCand.similarityScore : 0,
        relationship: evaluatedCand?.semanticRelationship || 'n/a'
      });
    }
  }

  const precision = results.tp + results.fp > 0 ? results.tp / (results.tp + results.fp) : 1.0;
  const recall = results.tp + results.fn > 0 ? results.tp / (results.tp + results.fn) : 0.0;
  const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0.0;
  const fpr = results.fp + results.tn > 0 ? results.fp / (results.fp + results.tn) : 0.0;
  const avgLatency = results.latencies.length > 0
    ? Math.round(results.latencies.reduce((a, b) => a + b, 0) / results.latencies.length)
    : 0;

  return {
    ...results,
    precision: Math.round(precision * 1000) / 10,
    recall: Math.round(recall * 1000) / 10,
    f1: Math.round(f1 * 1000) / 10,
    fpr: Math.round(fpr * 1000) / 10,
    avgLatency
  };
}

async function runEvaluation() {
  console.log('======================================================================');
  console.log('  CIVICCONNECT G3: DUPLICATE DETECTION BENCHMARK EVALUATION           ');
  console.log('======================================================================\n');

  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const testUser = await User.create({
    name: 'Benchmark Citizen',
    email: 'bench@civicconnect.org',
    password: 'password123',
    role: 'citizen'
  });

  try {
    console.log('1. Evaluating Pure Deterministic Baseline Engine...');
    const deterministic = await evaluateMode({ enableSemantic: false, testUser });

    console.log('2. Evaluating Hybrid Gemini Semantic Duplicate Engine...');
    const hybrid = await evaluateMode({ enableSemantic: true, testUser });

    console.log('\n======================================================================');
    console.log('  BENCHMARK PERFORMANCE COMPARISON                                    ');
    console.log('======================================================================\n');

    console.log('| Metric                     | Deterministic Baseline | Hybrid Gemini Semantic | Improvement |');
    console.log('|----------------------------|------------------------|------------------------|-------------|');
    console.log(`| Precision                  | ${String(deterministic.precision + '%').padEnd(22)} | ${String(hybrid.precision + '%').padEnd(22)} | ${hybrid.precision >= deterministic.precision ? '+' : ''}${(hybrid.precision - deterministic.precision).toFixed(1)}% |`);
    console.log(`| Recall                     | ${String(deterministic.recall + '%').padEnd(22)} | ${String(hybrid.recall + '%').padEnd(22)} | ${hybrid.recall >= deterministic.recall ? '+' : ''}${(hybrid.recall - deterministic.recall).toFixed(1)}% |`);
    console.log(`| F1 Score                   | ${String(deterministic.f1 + '%').padEnd(22)} | ${String(hybrid.f1 + '%').padEnd(22)} | ${hybrid.f1 >= deterministic.f1 ? '+' : ''}${(hybrid.f1 - deterministic.f1).toFixed(1)}% |`);
    console.log(`| False Positive Rate (FPR)  | ${String(deterministic.fpr + '%').padEnd(22)} | ${String(hybrid.fpr + '%').padEnd(22)} | ${(hybrid.fpr - deterministic.fpr).toFixed(1)}% |`);
    console.log(`| True Positives (TP)        | ${String(deterministic.tp).padEnd(22)} | ${String(hybrid.tp).padEnd(22)} | - |`);
    console.log(`| False Positives (FP)       | ${String(deterministic.fp).padEnd(22)} | ${String(hybrid.fp).padEnd(22)} | - |`);
    console.log(`| True Negatives (TN)        | ${String(deterministic.tn).padEnd(22)} | ${String(hybrid.tn).padEnd(22)} | - |`);
    console.log(`| False Negatives (FN)       | ${String(deterministic.fn).padEnd(22)} | ${String(hybrid.fn).padEnd(22)} | - |`);
    console.log(`| Average Latency (ms)       | ${String(deterministic.avgLatency + ' ms').padEnd(22)} | ${String(hybrid.avgLatency + ' ms').padEnd(22)} | - |`);
    console.log('======================================================================\n');

    console.log('Detailed Predictions (Hybrid Gemini):');
    hybrid.predictions.forEach(p => {
      const mark = (p.isActuallyDuplicate === p.predictedDuplicate) ? '✓ CORRECT' : '✗ MISMATCH';
      console.log(`  [${p.scenarioId} -> ${p.candidateId}] GroundTruthDup: ${p.isActuallyDuplicate}, PredDup: ${p.predictedDuplicate} (Score: ${p.score}, Rel: ${p.relationship}) -> ${mark}`);
    });

  } finally {
    await mongoose.disconnect();
    await mongoServer.stop();
  }
}

if (require.main === module) {
  runEvaluation().catch(err => {
    console.error('Benchmark Evaluation Failed:', err);
    process.exitCode = 1;
  });
}

module.exports = { evaluateMode, runEvaluation };
