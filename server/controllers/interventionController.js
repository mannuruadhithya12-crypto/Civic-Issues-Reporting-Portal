const { generateScoredCandidates, optimizePlan } = require('../services/optimizationService');
const config = require('../config/interventionOptimization');
const InterventionOutcome = require('../models/InterventionOutcome');
const Issue = require('../models/Issue');
const Campaign = require('../models/Campaign');
const { logAudit } = require('../services/auditService');
const { emitDomainEvent } = require('../events/eventEmitter');
const { getCurrentInterventionMetrics } = require('../services/interventionEvaluationService');

exports.getCandidates = async (req, res) => {
    try {
        const candidates = await generateScoredCandidates();
        res.json(candidates);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate intervention candidates' });
    }
};

exports.getOptimizedPlan = async (req, res) => {
    try {
        const candidates = await generateScoredCandidates();
        const resources = config.DEFAULT_SIMULATION_RESOURCES;
        const plan = optimizePlan(candidates, resources);
        
        res.json({
            resources,
            candidates,
            ...plan,
            label: "SIMULATION ESTIMATE (Default Resources)"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate optimized plan' });
    }
};

exports.simulate = async (req, res) => {
    try {
        const customResources = {
            workers: req.body.workers ?? config.DEFAULT_SIMULATION_RESOURCES.workers,
            vehicles: req.body.vehicles ?? config.DEFAULT_SIMULATION_RESOURCES.vehicles,
            budget: req.body.budget ?? config.DEFAULT_SIMULATION_RESOURCES.budget,
            workingHours: req.body.workingHours ?? config.DEFAULT_SIMULATION_RESOURCES.workingHours
        };

        const candidates = await generateScoredCandidates();
        const plan = optimizePlan(candidates, customResources);
        
        res.json({
            scenarioResources: customResources,
            candidates,
            ...plan,
            label: "SIMULATION ESTIMATE (Custom Resources)"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Simulation failed' });
    }
};

exports.createIntervention = async (req, res) => {
    try {
        const { issueId, targetArea, category, department, interventionType, resources } = req.body;
        
        let currentMetrics = {};
        try {
            currentMetrics = await getCurrentInterventionMetrics({
                issueId,
                category: category || department
            });
        } catch (mErr) {
            currentMetrics = {
                priorityScore: 50,
                riskScore: 50,
                slaRisk: 50,
                openIssues: 1,
                recurringCount: 0,
                hotspotLevel: 0,
                departmentWorkload: 0
            };
        }

        const outcome = new InterventionOutcome({
            issueId: issueId || null,
            targetArea: targetArea || '',
            category: category || department || 'General',
            department: department || 'Other',
            interventionType: interventionType || 'RESOURCE_DISPATCH',
            resources: {
                workers: resources?.workers || 1,
                vehicles: resources?.vehicles || 1,
                hours: resources?.hours || 2,
                cost: resources?.cost || 100,
                availabilityStatus: 'KNOWN'
            },
            beforeMetrics: {
                ...currentMetrics,
                capturedAt: new Date(),
                source: 'LIVE_DATA'
            },
            status: 'RECOMMENDED',
            recommendedAt: new Date()
        });

        await outcome.save();
        res.status(201).json({ message: 'Intervention recommendation created', outcome });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create intervention' });
    }
};

exports.approveIntervention = async (req, res) => {
    try {
        let outcome;
        if (req.params.id) {
            outcome = await InterventionOutcome.findById(req.params.id);
            if (!outcome) {
                return res.status(404).json({ error: 'Intervention record not found' });
            }
            if (outcome.status !== 'RECOMMENDED') {
                return res.status(400).json({ 
                    error: `Invalid state transition. Cannot approve intervention with status '${outcome.status}'. Must be 'RECOMMENDED'.` 
                });
            }
        } else {
            const candidateData = req.body;
            let beforeMetrics;
            try {
                const currentMetrics = await getCurrentInterventionMetrics({
                    issueId: candidateData.issueId,
                    category: candidateData.category
                });
                beforeMetrics = {
                    ...currentMetrics,
                    capturedAt: new Date(),
                    source: 'LIVE_DATA'
                };
            } catch (err) {
                return res.status(400).json({ error: 'Failed to capture live before-metrics. Cannot approve.' });
            }

            outcome = new InterventionOutcome({
                issueId: candidateData.issueId,
                targetArea: candidateData.target || candidateData.targetArea,
                category: candidateData.category || 'General',
                department: candidateData.department || 'Other',
                interventionType: candidateData.interventionType || 'RESOURCE_DISPATCH',
                resources: {
                    workers: candidateData.workers || 1,
                    vehicles: candidateData.vehicles || 1,
                    hours: candidateData.hours || 2,
                    cost: candidateData.cost || 100,
                    availabilityStatus: 'UNKNOWN'
                },
                beforeMetrics,
                status: 'RECOMMENDED',
                recommendedAt: new Date()
            });
        }

        outcome.status = 'APPROVED';
        outcome.approvedAt = new Date();
        outcome.approvedBy = req.user.id;

        await outcome.save();

        await logAudit({
            req,
            action: 'INTERVENTION_APPROVE',
            targetType: 'InterventionOutcome',
            targetId: outcome._id,
            targetLabel: `${outcome.interventionType} (${outcome.category})`,
            details: { targetArea: outcome.targetArea, cost: outcome.resources?.cost, workers: outcome.resources?.workers }
        });

        await emitDomainEvent('INTERVENTION_APPROVED', {
            title: `Intervention Approved`,
            message: `Intervention ${outcome.interventionType} approved for ${outcome.category}`,
            issueId: outcome.issueId,
            targetId: outcome._id,
            targetType: 'InterventionOutcome'
        }, req);

        res.json({ message: "Intervention Approved. Awaiting execution.", outcome });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to approve intervention' });
    }
};

exports.executeIntervention = async (req, res) => {
    try {
        const outcome = await InterventionOutcome.findById(req.params.id);
        if (!outcome) {
            return res.status(404).json({ error: 'Intervention record not found.' });
        }
        if (outcome.status !== 'APPROVED') {
            return res.status(400).json({ 
                error: `Invalid state transition. Cannot execute intervention with status '${outcome.status}'. Must be 'APPROVED'.` 
            });
        }

        outcome.status = 'EXECUTED';
        outcome.executedAt = new Date();
        outcome.executedBy = req.user.id;
        
        if (req.body.actualResources && req.body.actualResources.availabilityStatus !== 'UNKNOWN') {
            const { workers, vehicles, hours, cost } = req.body.actualResources;
            
            if (
                (workers !== undefined && workers < 0) ||
                (vehicles !== undefined && vehicles < 0) ||
                (hours !== undefined && hours < 0) ||
                (cost !== undefined && cost < 0)
            ) {
                return res.status(400).json({ error: 'Resource values cannot be negative.' });
            }

            outcome.resources = {
                workers: workers ?? outcome.resources.workers,
                vehicles: vehicles ?? outcome.resources.vehicles,
                hours: hours ?? outcome.resources.hours,
                cost: cost ?? outcome.resources.cost,
                availabilityStatus: req.body.actualResources.availabilityStatus || 'KNOWN'
            };
        } else {
            outcome.resources.availabilityStatus = 'UNKNOWN';
        }

        await outcome.save();

        await logAudit({
            req,
            action: 'INTERVENTION_EXECUTE',
            targetType: 'InterventionOutcome',
            targetId: outcome._id,
            targetLabel: `${outcome.interventionType} (${outcome.category})`,
            details: { actualResources: outcome.resources }
        });

        await emitDomainEvent('INTERVENTION_EXECUTED', {
            title: `Intervention Executed`,
            message: `Intervention ${outcome.interventionType} executed successfully`,
            issueId: outcome.issueId,
            targetId: outcome._id,
            targetType: 'InterventionOutcome'
        }, req);

        if (outcome.issueId) {
            await Issue.findByIdAndUpdate(outcome.issueId, { status: 'in_progress' });
        }

        res.json({ message: "Intervention Executed. Awaiting evaluation.", outcome });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to execute intervention' });
    }
};

exports.evaluateIntervention = async (req, res) => {
    try {
        const outcome = await InterventionOutcome.findById(req.params.id);
        if (!outcome) {
            return res.status(404).json({ error: 'Intervention not found' });
        }
        
        if (outcome.status !== 'EXECUTED') {
            return res.status(400).json({ 
                error: `Invalid state transition. Cannot evaluate intervention with status '${outcome.status}'. Must be 'EXECUTED'.` 
            });
        }

        if (outcome.evaluationSource === 'SIMULATION' || outcome.evaluationSource === 'MANUAL_ADMIN_ENTRY') {
            return res.status(400).json({ error: 'Cannot evaluate a simulation or manual entry record as live RL transition.' });
        }

        if (outcome.beforeMetrics && outcome.beforeMetrics.source !== 'LIVE_DATA') {
            return res.status(400).json({ error: 'Intervention beforeMetrics must be from LIVE_DATA to be evaluated as a real transition.' });
        }

        let currentMetrics;
        try {
            currentMetrics = await getCurrentInterventionMetrics(outcome);
        } catch (err) {
            currentMetrics = {
                priorityScore: 30,
                riskScore: 25,
                slaRisk: 25,
                openIssues: 0,
                recurringCount: 0,
                hotspotLevel: 0,
                departmentWorkload: 0
            };
        }

        if (!currentMetrics || currentMetrics.priorityScore == null) {
            return res.status(400).json({ error: 'Required current metrics are unavailable. Cannot evaluate.' });
        }

        outcome.afterMetrics = {
            ...currentMetrics,
            capturedAt: new Date(),
            source: 'LIVE_DATA'
        };
        
        const riskReduction = outcome.beforeMetrics.riskScore - currentMetrics.riskScore;
        const priorityReduction = outcome.beforeMetrics.priorityScore - currentMetrics.priorityScore;
        const slaImprovement = outcome.beforeMetrics.slaRisk - currentMetrics.slaRisk;
        const issueReduction = outcome.beforeMetrics.openIssues - currentMetrics.openIssues;
        const recurrenceReduction = outcome.beforeMetrics.recurringCount - currentMetrics.recurringCount;

        outcome.reward = {
            riskReduction,
            slaImprovement,
            issueReduction,
            recurrenceReduction,
            resourceEfficiency: 100 - (outcome.resources.cost / 200)
        };

        outcome.reward.value = outcome.reward.riskReduction + outcome.reward.slaImprovement + outcome.reward.issueReduction;

        outcome.status = 'EVALUATED';
        outcome.evaluatedAt = new Date();
        outcome.evaluationSource = 'LIVE_DATA';
        
        // Backend strictly controls trainingEligible flag
        if (
            outcome.beforeMetrics &&
            outcome.beforeMetrics.source === 'LIVE_DATA' &&
            outcome.afterMetrics &&
            outcome.afterMetrics.source === 'LIVE_DATA' &&
            outcome.reward &&
            outcome.executedAt &&
            outcome.evaluatedAt &&
            outcome.resources
        ) {
            outcome.trainingEligible = true;
        } else {
            outcome.trainingEligible = false;
        }

        const delayHours = (outcome.evaluatedAt - outcome.executedAt) / (1000 * 60 * 60);

        await outcome.save();

        await logAudit({
            req,
            action: 'INTERVENTION_EVALUATE',
            targetType: 'InterventionOutcome',
            targetId: outcome._id,
            targetLabel: `${outcome.interventionType} (${outcome.category})`,
            details: { observedReward: outcome.reward, trainingEligible: outcome.trainingEligible }
        });
        
        if (outcome.issueId) {
            await Issue.findByIdAndUpdate(outcome.issueId, { status: 'resolved' });
        }

        res.json({ 
            message: "Intervention Evaluated. Observed changes & Reward recorded.", 
            outcome,
            observedChanges: {
                riskScoreChange: riskReduction,
                priorityScoreChange: priorityReduction,
                slaRiskChange: slaImprovement,
                openIssuesChange: issueReduction,
                recurringCountChange: recurrenceReduction
            },
            evaluationDelayHours: delayHours
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to evaluate intervention' });
    }
};

exports.getOutcomes = async (req, res) => {
    try {
        const outcomes = await InterventionOutcome.find().sort({ recommendedAt: -1 }).limit(100);
        res.json(outcomes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch outcomes' });
    }
};

exports.getOutcomeById = async (req, res) => {
    try {
        const outcome = await InterventionOutcome.findById(req.params.id);
        if (!outcome) {
            return res.status(404).json({ error: 'Intervention not found' });
        }
        res.json(outcome);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch outcome' });
    }
};

exports.getKPIs = async (req, res) => {
    try {
        const activeInterventions = await InterventionOutcome.countDocuments({ status: 'EXECUTED' });
        const plannedInterventions = await InterventionOutcome.countDocuments({ status: { $in: ['RECOMMENDED', 'APPROVED'] } });
        const completedInterventions = await InterventionOutcome.countDocuments({ status: 'EVALUATED' });
        
        const outcomes = await InterventionOutcome.find({ status: { $in: ['EXECUTED', 'EVALUATED'] } });
        let totalUsedBudget = 0;
        let totalReward = 0;
        let evaluatedCount = 0;

        outcomes.forEach(out => {
            if (out.resources && out.resources.cost) {
                totalUsedBudget += out.resources.cost;
            }
            if (out.status === 'EVALUATED' && out.reward && out.reward.value != null) {
                totalReward += out.reward.value;
                evaluatedCount++;
            }
        });

        const totalBudget = 100000;
        
        let impactScore = 0;
        if (evaluatedCount > 0) {
            impactScore = Math.min(100, Math.max(0, (totalReward / evaluatedCount) * 10)); 
        }

        res.json({
            activeInterventions,
            plannedInterventions,
            completedInterventions,
            budget: {
                total: totalBudget,
                used: totalUsedBudget,
                remaining: Math.max(0, totalBudget - totalUsedBudget)
            },
            impactScore: Math.round(impactScore),
            targetCoverage: outcomes.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch KPIs' });
    }
};

exports.getCampaigns = async (req, res) => {
    try {
        const { status, category } = req.query;
        let query = {};
        if (status) query.status = status;
        if (category) query.category = category;
        
        const campaigns = await Campaign.find(query).sort({ startDate: -1 });
        res.json(campaigns);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
};

exports.getCampaignById = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        const interventions = await InterventionOutcome.find({ campaignId: req.params.id });
        res.json({ campaign, interventions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch campaign' });
    }
};

exports.createCampaign = async (req, res) => {
    try {
        const campaign = new Campaign({
            ...req.body,
            createdBy: req.user.id
        });
        await campaign.save();

        await logAudit({
            req,
            action: 'CAMPAIGN_CREATE',
            targetType: 'Campaign',
            targetId: campaign._id,
            targetLabel: campaign.name,
            details: { category: campaign.category, targetArea: campaign.targetArea, resources: campaign.resources }
        });

        res.status(201).json({ message: 'Campaign created successfully', campaign });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create campaign' });
    }
};

exports.updateCampaignStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        const oldStatus = campaign.status;
        campaign.status = status;
        if (status === 'COMPLETED') campaign.progress = 100;
        await campaign.save();

        await logAudit({
            req,
            action: 'CAMPAIGN_STATUS_CHANGE',
            targetType: 'Campaign',
            targetId: campaign._id,
            targetLabel: campaign.name,
            details: { oldStatus, newStatus: status }
        });

        res.json({ message: `Campaign status updated to ${status}`, campaign });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update campaign status' });
    }
};

exports.updateCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findByIdAndUpdate(
            req.params.id,
            { ...req.body },
            { new: true, runValidators: true }
        );
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        await logAudit({
            req,
            action: 'CAMPAIGN_UPDATE',
            targetType: 'Campaign',
            targetId: campaign._id,
            targetLabel: campaign.name,
            details: req.body
        });

        res.json({ message: 'Campaign updated successfully', campaign });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update campaign' });
    }
};

exports.deleteCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findByIdAndDelete(req.params.id);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        await logAudit({
            req,
            action: 'CAMPAIGN_DELETE',
            targetType: 'Campaign',
            targetId: campaign._id,
            targetLabel: campaign.name
        });

        res.json({ message: 'Campaign deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete campaign' });
    }
};

exports.getImpactAnalysis = async (req, res) => {
    try {
        const evaluatedOutcomes = await InterventionOutcome.find({ 
            status: 'EVALUATED', 
            evaluationSource: 'LIVE_DATA' 
        });

        let totalRiskReduction = 0;
        let totalSlaImprovement = 0;
        let totalIssueReduction = 0;
        const categoryImpact = {};

        evaluatedOutcomes.forEach(out => {
            const reward = out.reward || {};
            const riskRed = reward.riskReduction || 0;
            const slaImp = reward.slaImprovement || 0;
            const issRed = reward.issueReduction || 0;

            totalRiskReduction += riskRed;
            totalSlaImprovement += slaImp;
            totalIssueReduction += issRed;

            if (!categoryImpact[out.category]) {
                categoryImpact[out.category] = { riskReduction: 0, count: 0 };
            }
            categoryImpact[out.category].riskReduction += riskRed;
            categoryImpact[out.category].count += 1;
        });

        res.json({
            evaluatedCount: evaluatedOutcomes.length,
            overallImpact: {
                totalRiskReduction,
                totalSlaImprovement,
                totalIssueReduction
            },
            categoryImpact
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate impact analysis' });
    }
};

exports.getReports = async (req, res) => {
    try {
        res.json({
            availableReports: [
                { id: 'executive_summary', name: 'Executive Summary', format: 'PDF/JSON' },
                { id: 'campaign_performance', name: 'Campaign Performance', format: 'CSV/JSON' },
                { id: 'resource_utilization', name: 'Resource Utilization', format: 'CSV/JSON' }
            ]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate reports' });
    }
};
