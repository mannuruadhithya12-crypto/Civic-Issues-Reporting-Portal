const fs = require('fs');
const path = require('path');
const { RandomForestClassifier } = require('ml-random-forest');
const { buildDataset } = require('./datasetBuilder');
const { evaluateModel } = require('./evaluate');
const PREDICTION_CONFIG = require('../config/prediction');
const { FEATURE_ORDER } = require('../services/featureEngineeringService');

async function trainModel() {
  console.log("Starting model training pipeline...");
  
  // 1. Build Historical Dataset
  const datasetResult = await buildDataset();
  
  if (datasetResult.status === "INSUFFICIENT_DATA") {
      return datasetResult;
  }

  // 2. Data Sufficiency Check
  if (datasetResult.samples < PREDICTION_CONFIG.MIN_TOTAL_SAMPLES ||
      datasetResult.positiveSamples < PREDICTION_CONFIG.MIN_POSITIVE_SAMPLES ||
      datasetResult.negativeSamples < PREDICTION_CONFIG.MIN_NEGATIVE_SAMPLES) {
      return {
          status: "INSUFFICIENT_DATA",
          message: "Insufficient data to train a reliable model.",
          trainingSamples: datasetResult.samples,
          positiveSamples: datasetResult.positiveSamples,
          negativeSamples: datasetResult.negativeSamples,
          minimumRequired: {
              total: PREDICTION_CONFIG.MIN_TOTAL_SAMPLES,
              positive: PREDICTION_CONFIG.MIN_POSITIVE_SAMPLES,
              negative: PREDICTION_CONFIG.MIN_NEGATIVE_SAMPLES
          }
      };
  }

  // 3. Chronological Train/Test Split
  // datasetResult.dataset is already sorted chronologically
  const splitIndex = Math.floor(datasetResult.samples * PREDICTION_CONFIG.TRAIN_SPLIT_RATIO);
  
  const trainData = datasetResult.dataset.slice(0, splitIndex);
  const testData = datasetResult.dataset.slice(splitIndex);

  const X_train = trainData.map(d => d.features);
  const y_train = trainData.map(d => d.target);

  const X_test = testData.map(d => d.features);
  const y_test = testData.map(d => d.target);

  console.log(`Split: Train=${trainData.length}, Test=${testData.length}`);

  // 4. Baseline Evaluation
  // A naive baseline: Predict 1 if issuesLast30Days > 0 (index 3 in FEATURE_ORDER)
  // Let's use recentGrowth > 0 (index 8) or issuesLast7Days > 0 (index 2)
  const baselineIndex = FEATURE_ORDER.indexOf('categoryIssuesLast7Days');
  const baselinePredictions = testData.map(d => d.features[baselineIndex] > 0 ? 1 : 0);
  const baselineMetrics = evaluateModel(y_test, baselinePredictions);

  // 5. Train Random Forest
  const options = {
    seed: 42,
    maxFeatures: 0.8,
    replacement: true,
    nEstimators: 50
  };
  
  const classifier = new RandomForestClassifier(options);
  classifier.train(X_train, y_train);

  // 6. Evaluate Random Forest
  const rfPredictions = classifier.predict(X_test);
  const rfMetrics = evaluateModel(y_test, rfPredictions);

  // Determine if model is low confidence (worse than baseline or F1 too low)
  let status = "READY";
  if (rfMetrics.f1 <= baselineMetrics.f1 && rfMetrics.f1 < 0.5) {
      status = "LOW_CONFIDENCE";
  }

  // 7. Save Artifact and Metadata
  const artifactDir = path.resolve(__dirname, 'artifacts');
  if (!fs.existsSync(artifactDir)){
      fs.mkdirSync(artifactDir, { recursive: true });
  }

  const modelJSON = classifier.toJSON();
  
  const metadata = {
      status,
      modelVersion: PREDICTION_CONFIG.MODEL_VERSION,
      trainedAt: new Date(),
      trainingStart: trainData[0].cutoff,
      trainingEnd: trainData[trainData.length - 1].cutoff,
      testStart: testData[0].cutoff,
      testEnd: testData[testData.length - 1].cutoff,
      trainingSamples: trainData.length,
      testSamples: testData.length,
      positiveSamples: datasetResult.positiveSamples,
      negativeSamples: datasetResult.negativeSamples,
      featureNames: FEATURE_ORDER,
      targetDefinition: `Activity >= ${PREDICTION_CONFIG.TARGET_ACTIVITY_THRESHOLD} issues in horizon`,
      predictionHorizon: PREDICTION_CONFIG.HORIZON_DAYS,
      gridSize: PREDICTION_CONFIG.GRID_SIZE_METERS,
      baselineMetrics,
      metrics: rfMetrics
  };

  const artifactPath = path.join(artifactDir, 'model_v1.json');
  const metadataPath = path.join(artifactDir, 'metadata_v1.json');

  fs.writeFileSync(artifactPath, JSON.stringify(modelJSON));
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  console.log("Model training complete.");

  return {
      status,
      message: "Training successful.",
      metadata
  };
}

module.exports = { trainModel };
