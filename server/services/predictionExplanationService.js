const { FEATURE_ORDER } = require('./featureEngineeringService');

function generateExplanation(featuresVector, riskLevel) {
    const factors = [];
    
    // Deconstruct features
    const features = {};
    FEATURE_ORDER.forEach((key, i) => features[key] = featuresVector[i]);

    if (riskLevel === 'HIGH' || riskLevel === 'MEDIUM') {
        if (features.recentGrowth >= 1.5) {
            factors.push("Strong recent increase in issue reports.");
        }
        if (features.categoryIssuesLast30Days >= 5) {
            factors.push("High historical frequency over the last month.");
        }
        if (features.nearbyCategoryCount >= 3) {
            factors.push("Significant clustering of similar issues nearby.");
        }
        if (features.slaBreachesBeforeCutoff > 0) {
            factors.push("Past operational strain detected (SLA breaches).");
        }
        if (features.highSeverityCount + features.criticalSeverityCount >= 2) {
            factors.push("Elevated severity of recent reports.");
        }
        if (features.openIssuesAtCutoff >= 3) {
            factors.push("High number of currently active issues in area.");
        }
    } else {
        factors.push("Low historical issue volume.");
        if (features.recentGrowth <= 0) {
            factors.push("Issue reports are stable or decreasing.");
        }
    }

    // Default if none met
    if (factors.length === 0) {
        factors.push("Predicted by historical baseline patterns.");
    }

    return factors;
}

module.exports = { generateExplanation };
