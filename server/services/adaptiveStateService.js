const stateEncoder = require('../ml/reinforcementLearning/stateEncoder');

const ADAPTIVE_STATE_VERSION = "state-v2";

/**
 * Unified Civic State Engine (Phase 9.1)
 */
class AdaptiveStateService {
    /**
     * Builds the unified civic state for decision making.
     * @param {Object} issue - The civic issue object
     * @param {Object} context - Optional context (e.g. predictions, current workload)
     * @param {String} version - The requested state version (defaults to 'state-v2')
     */
    static buildState(issue, context = {}, version = ADAPTIVE_STATE_VERSION) {
        if (!issue) {
            throw new Error("Issue is required to build civic state");
        }

        // Base metrics (raw features typically extracted before intervention)
        const rawMetrics = {
            priorityScore: issue.priorityScore !== undefined ? issue.priorityScore : null,
            riskScore: context.predictedRisk !== undefined ? context.predictedRisk : (issue.riskScore !== undefined ? issue.riskScore : null),
            slaRisk: this._calculateSLARisk(issue),
            openIssues: context.openIssues !== undefined ? context.openIssues : null,
            recurringCount: context.recurringCount !== undefined ? context.recurringCount : null,
            hotspotLevel: context.hotspotLevel !== undefined ? context.hotspotLevel : null,
            departmentWorkload: context.departmentWorkload !== undefined ? context.departmentWorkload : null
        };

        // Ensure state-v1 compatibility for RL Models
        const stateV1 = this._buildStateV1(rawMetrics);

        if (version === 'state-v1') {
            return stateV1;
        }

        // state-v2 represents the unified, expanded state abstraction
        const stateV2 = {
            version: 'state-v2',
            generatedAt: new Date().toISOString(),
            source: 'AdaptiveStateService',
            
            // Raw values from the system
            rawFeatures: {
                ...rawMetrics,
                category: issue.category || null,
                department: issue.department || issue.category || null,
                latitude: issue.location && issue.location.coordinates ? issue.location.coordinates[1] : null,
                longitude: issue.location && issue.location.coordinates ? issue.location.coordinates[0] : null
            },
            
            // Derived or contextual features
            derivedFeatures: {
                isEmergency: rawMetrics.priorityScore >= 80,
                isHighRisk: rawMetrics.riskScore >= 70,
                requiresImmediateAction: rawMetrics.priorityScore >= 80 || rawMetrics.riskScore >= 70,
                daysOpen: this._calculateDaysOpen(issue)
            },

            // Normalized features (reusing state-v1's logic for consistency)
            normalizedFeatures: {
                vector: stateV1.vector,
                metadata: stateEncoder.FEATURE_METADATA
            },

            // Evidence & Metadata
            evidenceMetadata: {
                missingFeatures: stateV1.missingFeatures,
                hasMissingCritical: stateV1.hasMissingCritical,
                dataQualityStatus: stateV1.hasMissingCritical ? 'DEGRADED' : 'OPTIMAL',
                featureAvailability: this._calculateFeatureAvailability(rawMetrics)
            },

            // For strict backward compatibility when passing into the RL system
            stateV1: stateV1
        };

        if (version === 'state-v2') {
            return stateV2;
        }

        throw new Error(`Unsupported state version: ${version}`);
    }

    static _buildStateV1(metrics) {
        // We reuse the exact Sprint 8 state encoder for V1.
        // The encoder expects an InterventionOutcomeRecord format containing beforeMetrics.
        const mockRecord = { beforeMetrics: metrics };
        return stateEncoder.encodeState(mockRecord);
    }

    static _calculateSLARisk(issue) {
        if (!issue.createdAt) return null;
        const daysOpen = this._calculateDaysOpen(issue);
        // Basic heuristic: 10 days = 100% SLA risk
        return Math.min(100, (daysOpen / 10) * 100);
    }

    static _calculateDaysOpen(issue) {
        if (!issue.createdAt) return 0;
        const now = new Date();
        const created = new Date(issue.createdAt);
        return Math.max(0, (now - created) / (1000 * 60 * 60 * 24));
    }

    static _calculateFeatureAvailability(metrics) {
        const total = Object.keys(metrics).length;
        const available = Object.values(metrics).filter(v => v !== null && v !== undefined && !isNaN(v)).length;
        return {
            total,
            available,
            percent: total > 0 ? (available / total) * 100 : 0
        };
    }
}

module.exports = AdaptiveStateService;
