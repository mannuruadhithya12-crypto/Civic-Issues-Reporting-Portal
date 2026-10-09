function evaluateModel(y_true, y_pred) {
    let tp = 0;
    let tn = 0;
    let fp = 0;
    let fn = 0;

    for (let i = 0; i < y_true.length; i++) {
        if (y_true[i] === 1 && y_pred[i] === 1) tp++;
        else if (y_true[i] === 0 && y_pred[i] === 0) tn++;
        else if (y_true[i] === 0 && y_pred[i] === 1) fp++;
        else if (y_true[i] === 1 && y_pred[i] === 0) fn++;
    }

    const accuracy = (tp + tn) / y_true.length || 0;
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1 = (precision === 0 && recall === 0) ? 0 : 2 * (precision * recall) / (precision + recall);

    return {
        accuracy: Number(accuracy.toFixed(4)),
        precision: Number(precision.toFixed(4)),
        recall: Number(recall.toFixed(4)),
        f1: Number(f1.toFixed(4)),
        confusionMatrix: { tp, tn, fp, fn }
    };
}

module.exports = { evaluateModel };
