const actionEncoder = require('./actionEncoder');

const ACTION_SPECIFICATION = {
    version: actionEncoder.VERSION,
    actionCount: actionEncoder.ACTION_CATALOG.length,
    actions: actionEncoder.ACTION_CATALOG.map((action, index) => ({
        id: index,
        key: action.type,
        baseResourceRequirements: {
            workers: action.workers,
            vehicles: action.vehicles,
            estimatedCost: action.estimatedCost,
            hours: action.hours
        }
    }))
};

module.exports = ACTION_SPECIFICATION;
