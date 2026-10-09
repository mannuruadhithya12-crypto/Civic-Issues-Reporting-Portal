# CivicConnect Reinforcement Learning (DQN)

This document describes the Deep Q-Network (DQN) integration into CivicConnect (Sprint 8.5–8.9).

## Architecture

The system uses `@tensorflow/tfjs` in Node.js to implement a fully offline DQN policy.

- **State Representation (`state-v1`)**: 7-dimensional continuous feature vector (priorityScore, riskScore, slaRisk, openIssues, recurringCount, hotspotLevel, departmentWorkload).
- **Action Representation (`action-v1`)**: Deterministic integer IDs mapped from the exact Sprint 7 Intervention Catalog.
- **Environment (`environment-v1`)**: Offline historical transitions without fabricated counterfactuals.

## Data Sufficiency Gate
The system strictly enforces Data Health before allowing production training.
A transition is only `trainingEligible` if `status === "EVALUATED"` and `evaluationSource === "LIVE_DATA"`.
Production training requires minimum thresholds (e.g., 50 transitions, 5 positive rewards, 7 days coverage). If these are not met, the system returns `INSUFFICIENT_DATA`. 
**We never fabricate transitions or manipulate metrics to bypass this gate.**

## Training Process & Replay Buffer
The `dqnTrainingService` extracts genuine eligible transitions and populates a Bounded Circular Replay Buffer. 
- During `trainStep()`, minibatches are sampled using Huber Loss between the online network's Q-values and the Bellman target from the target network.
- Invalid actions are strictly masked using `(mask - 1) * 1e9` inside the TF graph to prevent `argmax` from selecting them.
- `PROTOTYPE_ONLY` mode bypasses the data-health check for mechanical validation but strictly flags the resulting model as a prototype.

## Shadow Mode & Offline Evaluation
- **Offline Evaluation**: The DQN runs epsilon-greedy (with `epsilon = 0`) against all historical transitions to calculate Action Agreement Rate. 
- **Shadow Mode**: Evaluates an issue state using the active DQN model alongside the deterministic optimizer. Shadow mode is strictly READ-ONLY and will never dispatch interventions automatically.

## Limitations
- **No Counterfactual Reward Generation**: The current offline environment cannot invent a reward if the DQN selects an action different from history.
- **Data Dependency**: The DQN requires extensive real-world usage of Sprint 7 before a Production model can be validated.
