// server/services/duplicateMatchingEngine.js
'use strict';

const Issue = require('../models/Issue');
const { compareSemanticDuplicates } = require('./gemini/duplicateIntelligence');

/**
 * Default weights and thresholds for duplicate detection heuristic scoring.
 * (Heuristic multi-factor composite, NOT a calibrated ML probability model).
 */
const ENGINE_CONFIG = {
    DEFAULT_RADIUS_METERS: 300,
    MAX_RADIUS_METERS: 500,
    MIN_RADIUS_METERS: 10,
    DUPLICATE_THRESHOLD: 0.60, // Score >= 0.60 recommended as a potential duplicate candidate
    WEIGHTS: {
        TEXT: 0.45,
        SPATIAL: 0.35,
        CATEGORY: 0.15,
        TEMPORAL: 0.05
    },
    MAX_DB_CANDIDATES: 25
};

const STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
    'by', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for',
    'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself',
    'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'me',
    'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
    'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
    'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
    'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
    'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
    'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Category & Department compatibility matrix.
 * In the CivicConnect schema, `department` contains both departments ('Roads')
 * and specific complaint types ('Potholes', 'Broken footpaths').
 */
const CATEGORY_COMPATIBILITY = {
    'roads': ['roads', 'potholes', 'broken footpaths', 'damaged roads', 'pothole', 'street maintenance'],
    'potholes': ['roads', 'potholes', 'broken footpaths', 'damaged roads', 'pothole'],
    'broken footpaths': ['roads', 'potholes', 'broken footpaths', 'footpaths', 'sidewalk'],
    'waste': ['waste', 'garbage overflow', 'sanitation', 'garbage', 'litter', 'trash', 'dumping'],
    'garbage overflow': ['waste', 'garbage overflow', 'sanitation', 'garbage', 'trash', 'litter'],
    'sanitation': ['sanitation', 'waste', 'garbage overflow', 'sewage problems', 'cleanliness', 'public toilets'],
    'electricity': ['electricity', 'streetlight failures', 'lighting', 'street light', 'electrical', 'power outage'],
    'streetlight failures': ['electricity', 'streetlight failures', 'lighting', 'street light', 'electrical'],
    'water': ['water', 'water leakage', 'drainage issues', 'sewage problems', 'pipeline', 'water supply'],
    'water leakage': ['water', 'water leakage', 'drainage issues', 'pipeline', 'water supply'],
    'drainage issues': ['water', 'water leakage', 'drainage issues', 'sewage problems', 'drainage'],
    'sewage problems': ['water', 'drainage issues', 'sewage problems', 'sanitation', 'sewage'],
    'public safety': ['public safety', 'public safety issues', 'illegal parking', 'hazard', 'traffic'],
    'public safety issues': ['public safety', 'public safety issues', 'hazard', 'safety'],
    'illegal parking': ['illegal parking', 'public safety', 'roads', 'traffic'],
    'noise pollution': ['noise pollution', 'public safety issues', 'public safety'],
    'parks': ['parks', 'trees', 'playground', 'park maintenance']
};

/**
 * Calculates geodesic distance between two coordinate pairs using Haversine formula.
 * @returns {number} Distance in meters.
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    if (lat1 === lat2 && lon1 === lon2) return 0;
    const R = 6371000; // Earth's mean radius in meters
    const rad = Math.PI / 180;
    const phi1 = lat1 * rad;
    const phi2 = lat2 * rad;
    const deltaPhi = (lat2 - lat1) * rad;
    const deltaLambda = (lon2 - lon1) * rad;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
}

const CIVIC_SYNONYMS = {
    'crater': 'pothole',
    'craters': 'pothole',
    'hole': 'pothole',
    'holes': 'pothole',
    'cavity': 'pothole',
    'potholes': 'pothole',
    'lamp': 'light',
    'lamps': 'light',
    'bulb': 'light',
    'streetlight': 'light',
    'streetlights': 'light',
    'lighting': 'light',
    'trash': 'garbage',
    'waste': 'garbage',
    'litter': 'garbage',
    'rubbish': 'garbage',
    'dumping': 'garbage',
    'burst': 'leak',
    'leakage': 'leak',
    'leaking': 'leak',
    'seeping': 'leak',
    'sidewalk': 'footpath',
    'sidewalks': 'footpath',
    'pavement': 'footpath',
    'footpaths': 'footpath'
};

/**
 * Tokenizes text, strips punctuation, downcases, applies civic synonym normalization,
 * and removes common stop words.
 * @param {string} text 
 * @returns {string[]}
 */
function tokenizeAndNormalize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map(t => CIVIC_SYNONYMS[t] || t)
        .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Jaccard token similarity: |A ∩ B| / |A ∪ B|.
 */
function jaccardSimilarity(tokensA, tokensB) {
    if (!tokensA.length || !tokensB.length) return 0;
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    let intersection = 0;
    for (const t of setA) {
        if (setB.has(t)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
}

/**
 * Extract character n-grams.
 */
function getNGrams(str, n = 3) {
    const s = `  ${str.toLowerCase().trim()}  `;
    const ngrams = new Set();
    for (let i = 0; i <= s.length - n; i++) {
        ngrams.add(s.substring(i, i + n));
    }
    return ngrams;
}

/**
 * Character n-gram similarity (Sørensen-Dice coefficient).
 */
function nGramSimilarity(strA, strB, n = 3) {
    if (!strA || !strB) return 0;
    if (strA.toLowerCase().trim() === strB.toLowerCase().trim()) return 1.0;
    const ngramsA = getNGrams(strA, n);
    const ngramsB = getNGrams(strB, n);
    if (!ngramsA.size || !ngramsB.size) return 0;
    let matchCount = 0;
    for (const ng of ngramsA) {
        if (ngramsB.has(ng)) matchCount++;
    }
    return (2 * matchCount) / (ngramsA.size + ngramsB.size);
}

/**
 * Levenshtein edit-distance similarity: 1 - (dist / maxLen).
 */
function levenshteinSimilarity(strA, strB) {
    const s1 = (strA || '').toLowerCase().trim();
    const s2 = (strB || '').toLowerCase().trim();
    if (s1 === s2) return 1.0;
    const len1 = s1.length;
    const len2 = s2.length;
    if (!len1 || !len2) return 0;
    if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.8) return 0;

    const matrix = [];
    for (let i = 0; i <= len1; i++) matrix[i] = [i];
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    const dist = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return Math.max(0, 1 - dist / maxLen);
}

/**
 * Combined textual similarity for title and description.
 * Blends Token Jaccard (40%), Trigram Dice (40%), and Levenshtein Edit (20%)
 * across field alignments and full-context corpus overlap.
 */
function computeTextSimilarity(targetTitle, targetDesc, candidateTitle, candidateDesc) {
    const titleA = targetTitle || '';
    const titleB = candidateTitle || '';
    const descA = targetDesc || '';
    const descB = candidateDesc || '';

    // Title metrics
    const titleTokensA = tokenizeAndNormalize(titleA);
    const titleTokensB = tokenizeAndNormalize(titleB);
    const titleJaccard = jaccardSimilarity(titleTokensA, titleTokensB);
    const titleNGram = nGramSimilarity(titleA, titleB, 3);
    const titleLev = levenshteinSimilarity(titleA, titleB);
    const titleSim = (0.4 * titleJaccard) + (0.4 * titleNGram) + (0.2 * titleLev);

    // Description metrics (if present on both)
    let descSim = titleSim;
    if (descA.trim() && descB.trim()) {
        const descTokensA = tokenizeAndNormalize(descA);
        const descTokensB = tokenizeAndNormalize(descB);
        const descJaccard = jaccardSimilarity(descTokensA, descTokensB);
        const descNGram = nGramSimilarity(descA, descB, 3);
        const descLev = levenshteinSimilarity(descA, descB);
        descSim = (0.4 * descJaccard) + (0.4 * descNGram) + (0.2 * descLev);
    }

    // Full text cross-metrics (union of title and description)
    const fullTextA = `${titleA} ${descA}`.trim();
    const fullTextB = `${titleB} ${descB}`.trim();
    const fullTokensA = tokenizeAndNormalize(fullTextA);
    const fullTokensB = tokenizeAndNormalize(fullTextB);
    const fullJaccard = jaccardSimilarity(fullTokensA, fullTokensB);
    const fullNGram = nGramSimilarity(fullTextA, fullTextB, 3);
    const fullSim = (0.5 * fullJaccard) + (0.5 * fullNGram);

    // Blended effective similarity takes the max of field average or overall cross-context overlap
    const fieldAvg = (0.5 * titleSim) + (0.5 * descSim);
    const effective = Math.max(fullSim, fieldAvg);
    return Math.round(Math.min(1.0, Math.max(0.0, effective)) * 100) / 100;
}

/**
 * Determines compatibility score between two category / department strings.
 */
function computeCategoryCompatibility(catA, catB) {
    if (!catA || !catB) return 0.5;
    const a = catA.toLowerCase().trim();
    const b = catB.toLowerCase().trim();
    if (a === b) return 1.0;

    const listA = CATEGORY_COMPATIBILITY[a] || [];
    const listB = CATEGORY_COMPATIBILITY[b] || [];

    if (listA.includes(b) || listB.includes(a)) {
        return 0.85;
    }

    if (a === 'other' || b === 'other') {
        return 0.4;
    }

    return 0.0;
}

/**
 * Calculates temporal relevance score for a candidate issue.
 */
function computeTemporalRelevance(candidate) {
    const status = (candidate.status || 'reported').toLowerCase();
    const activeStatuses = ['reported', 'verified', 'assigned', 'in_progress', 'reopened'];

    if (activeStatuses.includes(status)) {
        return 1.0;
    }

    const resolvedTime = candidate.resolvedAt || candidate.closedAt || candidate.updatedAt || candidate.createdAt;
    if (!resolvedTime) return 0.5;

    const ageDays = (Date.now() - new Date(resolvedTime).getTime()) / (1000 * 60 * 60 * 24);

    if (ageDays <= 7) return 0.8;
    if (ageDays <= 30) return 0.5;
    if (ageDays <= 90) return 0.2;
    return 0.1;
}

/**
 * Computes spatial proximity score with distance decay.
 */
function computeSpatialProximity(distanceMeters, radiusMeters) {
    if (distanceMeters > radiusMeters) return 0.0;
    if (distanceMeters <= 5) return 1.0;
    // Linear decay from 1.0 (at 0m) to 0.0 (at radiusMeters)
    const score = 1.0 - (distanceMeters / radiusMeters);
    return Math.round(Math.max(0.0, Math.min(1.0, score)) * 100) / 100;
}

/**
 * Evaluates a single candidate issue against the target complaint.
 */
function evaluateCandidate(query, candidate, radiusMeters) {
    // 1. Coordinates check
    const coords = candidate.coordinates?.coordinates || [];
    const candLon = coords[0];
    const candLat = coords[1];

    if (typeof candLat !== 'number' || typeof candLon !== 'number' || isNaN(candLat) || isNaN(candLon)) {
        return null;
    }

    const distanceMeters = haversineDistanceMeters(query.latitude, query.longitude, candLat, candLon);
    if (distanceMeters > radiusMeters) {
        return null; // Outside search boundary
    }

    // 2. Factor computations
    const spatialProximity = computeSpatialProximity(distanceMeters, radiusMeters);
    const textualSimilarity = computeTextSimilarity(
        query.title,
        query.description,
        candidate.title,
        candidate.description
    );
    const categoryMatch = computeCategoryCompatibility(
        query.category || query.department,
        candidate.department
    );
    const temporalRelevance = computeTemporalRelevance(candidate);

    // 3. Composite score calculation
    const W = ENGINE_CONFIG.WEIGHTS;
    let similarityScore = (
        (spatialProximity * W.SPATIAL) +
        (textualSimilarity * W.TEXT) +
        (categoryMatch * W.CATEGORY) +
        (temporalRelevance * W.TEMPORAL)
    );

    // 4. Critical Gating Rules:
    // A: Incompatible category (e.g. Streetlight vs Sewage) must not be flagged as a duplicate
    if (categoryMatch === 0.0) {
        similarityScore = Math.min(similarityScore, 0.35);
    }

    // B: Very low text similarity means different issue at same location
    if (textualSimilarity < 0.20) {
        similarityScore = Math.min(similarityScore, 0.30);
    }

    // C: Distant reports outside radius are already excluded, but if boundary edge has 0 spatial
    if (spatialProximity <= 0.05) {
        similarityScore = Math.min(similarityScore, 0.40);
    }

    similarityScore = Math.round(Math.min(1.0, Math.max(0.0, similarityScore)) * 100) / 100;

    // 5. Build explainable reasons
    const reasons = [];
    if (distanceMeters <= 50) {
        reasons.push(`Located very close (${Math.round(distanceMeters)}m away)`);
    } else {
        reasons.push(`Located ${Math.round(distanceMeters)}m away`);
    }

    if (textualSimilarity >= 0.70) {
        reasons.push(`High description and title overlap (${Math.round(textualSimilarity * 100)}%)`);
    } else if (textualSimilarity >= 0.40) {
        reasons.push(`Moderate textual similarity (${Math.round(textualSimilarity * 100)}%)`);
    } else {
        reasons.push(`Different problem description`);
    }

    if (categoryMatch === 1.0) {
        reasons.push(`Identical department/category (${candidate.department})`);
    } else if (categoryMatch >= 0.8) {
        reasons.push(`Compatible category (${candidate.department})`);
    } else {
        reasons.push(`Incompatible category (${candidate.department})`);
    }

    return {
        issueId: candidate._id,
        title: candidate.title,
        description: candidate.description,
        status: candidate.status,
        department: candidate.department,
        priority: candidate.priority,
        locationName: candidate.locationName || candidate.location,
        coordinates: {
            latitude: candLat,
            longitude: candLon
        },
        distanceMeters,
        similarityScore,
        matchFactors: {
            spatialProximity,
            textualSimilarity,
            categoryMatch,
            temporalRelevance
        },
        reasons,
        createdAt: candidate.createdAt
    };
}

/**
 * Primary entry point: Find duplicate candidates using bounded spatial query
 * followed by multi-factor scoring.
 * 
 * @param {Object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {string} [params.title]
 * @param {string} [params.description]
 * @param {string} [params.category]
 * @param {string} [params.department]
 * @param {number} [params.radiusMeters]
 * @param {string} [params.excludeIssueId]
 * @returns {Promise<Object>}
 */
async function findDuplicateCandidates(params = {}) {
    const {
        latitude,
        longitude,
        title = '',
        description = '',
        category,
        department,
        radiusMeters,
        excludeIssueId
    } = params;

    // Validate inputs
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return {
            success: false,
            error: 'INVALID_COORDINATES',
            message: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required.',
            candidates: [],
            count: 0,
            hasDuplicates: false
        };
    }

    // Clamp radius to safe operational boundaries
    const parsedRadius = parseInt(radiusMeters, 10);
    const radius = Math.min(
        ENGINE_CONFIG.MAX_RADIUS_METERS,
        Math.max(
            ENGINE_CONFIG.MIN_RADIUS_METERS,
            isNaN(parsedRadius) ? ENGINE_CONFIG.DEFAULT_RADIUS_METERS : parsedRadius
        )
    );

    // Build geospatial MongoDB query
    const queryFilter = {
        'coordinates.coordinates': { $exists: true, $type: 'array', $ne: [] },
        status: { $ne: 'rejected' }, // Rejected reports are excluded
        coordinates: {
            $nearSphere: {
                $geometry: {
                    type: 'Point',
                    coordinates: [lon, lat] // GeoJSON format: [longitude, latitude]
                },
                $maxDistance: radius
            }
        }
    };

    if (excludeIssueId) {
        queryFilter._id = { $ne: excludeIssueId };
    }

    // Execute bounded query
    const dbCandidates = await Issue.find(queryFilter)
        .select('_id title description department priority status location locationName coordinates createdAt resolvedAt closedAt')
        .limit(ENGINE_CONFIG.MAX_DB_CANDIDATES)
        .lean();

    const queryContext = {
        latitude: lat,
        longitude: lon,
        title,
        description,
        category: category || department,
        department: department || category
    };

    const scoredCandidates = [];
    for (const cand of dbCandidates) {
        const evaluated = evaluateCandidate(queryContext, cand, radius);
        if (evaluated) {
            scoredCandidates.push(evaluated);
        }
    }

    // Initial deterministic ranking (descending by score)
    scoredCandidates.sort((a, b) => b.similarityScore - a.similarityScore);

    // Hybrid Gemini Semantic Evaluation for top candidates
    let semanticResult = null;
    const hasSufficientContent = Boolean(
        (title && title.trim().length >= 5) &&
        (description && description.trim().length >= 10)
    );
    const enableSemantic = params.enableSemantic !== false && hasSufficientContent;

    if (enableSemantic && scoredCandidates.length > 0) {
        // Evaluate up to 5 top candidate issues within radius
        const topCandidates = scoredCandidates.slice(0, 5).map(c => ({
            id: String(c.issueId),
            title: c.title,
            description: c.description,
            department: c.department,
            distanceMeters: c.distanceMeters
        }));

        try {
            semanticResult = await compareSemanticDuplicates({
                targetIssue: {
                    title,
                    description,
                    department: department || category,
                    category: category || department
                },
                candidateIssues: topCandidates,
                timeoutMs: params.semanticTimeoutMs,
                geminiClient: params.geminiClient
            });
        } catch (err) {
            console.warn(`[DuplicateMatchingEngine] Semantic evaluation fallback: ${err.message}`);
            semanticResult = {
                available: false,
                comparisons: {},
                model: null
            };
        }
    }

    // Blend semantic signals if available
    for (const cand of scoredCandidates) {
        const candId = String(cand.issueId);
        const sem = semanticResult?.comparisons ? semanticResult.comparisons[candId] : null;

        let finalScore = cand.similarityScore;
        let semanticBoost = 0;

        if (sem && semanticResult.available) {
            cand.semanticRelationship = sem.semanticRelationship;
            cand.sameUnderlyingIssue = sem.sameUnderlyingIssue;
            cand.semanticEvidence = sem.evidence || [];
            cand.contradictingConcepts = sem.contradictingConcepts || [];
            cand.matchingConcepts = sem.matchingConcepts || [];

            // Apply Gating & Semantic Blending Rules
            if (cand.matchFactors.spatialProximity <= 0.05) {
                // Distant / boundary proximity can NEVER be a duplicate
                finalScore = Math.min(finalScore, 0.40);
            } else if (cand.matchFactors.categoryMatch === 0.0) {
                // Incompatible category can NEVER be a duplicate
                finalScore = Math.min(finalScore, 0.35);
            } else if (sem.semanticRelationship === 'same_issue' && sem.sameUnderlyingIssue) {
                // Confirmed same physical issue -> apply bounded semantic boost (+0.20)
                semanticBoost = 0.20;
                finalScore = Math.min(1.0, finalScore + semanticBoost);
                const conceptsStr = sem.matchingConcepts.length ? ` (${sem.matchingConcepts.slice(0, 3).join(', ')})` : '';
                cand.reasons.push(`AI Semantic Match: Same underlying issue detected${conceptsStr}`);
            } else if (sem.semanticRelationship === 'different_issue') {
                // Distinct issue at same location -> suppress duplicate score
                finalScore = Math.min(finalScore, 0.35);
                cand.reasons.push('AI Semantic Analysis: Distinct civic problem identified');
            } else if (sem.contradictingConcepts && sem.contradictingConcepts.length > 0) {
                // Contradicting concepts -> penalize score
                finalScore = Math.min(finalScore, 0.40);
                cand.reasons.push(`AI Semantic Analysis: Conflicting details detected (${sem.contradictingConcepts.slice(0, 2).join(', ')})`);
            } else if (sem.semanticRelationship === 'related_issue') {
                // Related issue -> cap strictly below duplicate threshold (0.60)
                finalScore = Math.min(finalScore, 0.55);
                cand.reasons.push('AI Semantic Analysis: Related context, but separate physical issue');
            } else if (sem.semanticRelationship === 'uncertain') {
                if (sem.uncertaintyReason) {
                    cand.reasons.push(`AI Semantic Analysis: Inconclusive (${sem.uncertaintyReason})`);
                }
            }

            cand.similarityScore = Math.round(finalScore * 100) / 100;
            cand.matchFactors = {
                ...cand.matchFactors,
                semanticBoost
            };
            cand.spatialProximity = cand.matchFactors.spatialProximity;
            cand.textualSimilarity = cand.matchFactors.textualSimilarity;
            cand.semanticSimilarity = null; // Strictly null: numeric semantic similarity is not fabricated
            cand.aiAvailable = true;
            cand.modelVersion = semanticResult.model;
        } else {
            // Pure deterministic fallback
            cand.semanticRelationship = null;
            cand.sameUnderlyingIssue = null;
            cand.semanticEvidence = [];
            cand.contradictingConcepts = [];
            cand.matchingConcepts = [];
            cand.spatialProximity = cand.matchFactors.spatialProximity;
            cand.textualSimilarity = cand.matchFactors.textualSimilarity;
            cand.semanticSimilarity = null;
            cand.aiAvailable = false;
            cand.modelVersion = null;
        }
    }

    // Re-sort descending by final similarity score
    scoredCandidates.sort((a, b) => b.similarityScore - a.similarityScore);

    const duplicateMatches = scoredCandidates.filter(c => c.similarityScore >= ENGINE_CONFIG.DUPLICATE_THRESHOLD);

    return {
        success: true,
        hasDuplicates: duplicateMatches.length > 0,
        count: duplicateMatches.length,
        threshold: ENGINE_CONFIG.DUPLICATE_THRESHOLD,
        candidates: scoredCandidates,
        totalChecked: dbCandidates.length,
        aiAvailable: semanticResult ? semanticResult.available : false,
        modelVersion: semanticResult ? semanticResult.model : null,
        semanticEvaluatedCount: semanticResult ? semanticResult.evaluatedCount : 0
    };
}

module.exports = {
    ENGINE_CONFIG,
    CATEGORY_COMPATIBILITY,
    haversineDistanceMeters,
    tokenizeAndNormalize,
    jaccardSimilarity,
    nGramSimilarity,
    levenshteinSimilarity,
    computeTextSimilarity,
    computeCategoryCompatibility,
    computeTemporalRelevance,
    computeSpatialProximity,
    evaluateCandidate,
    findDuplicateCandidates
};
