const Report = require('../models/Report');

async function getReports() {
  return await Report.find().sort({ createdAt: -1 }).limit(50);
}

async function createReport(userId, type, period) {
  const name = `${type} - ${new Date().toLocaleDateString()}`;
  const report = new Report({
    name,
    type,
    period,
    generatedBy: userId,
    status: 'Completed',
    fileUrl: '/api/issues/export' // Reuse the existing export endpoint for download
  });
  
  await report.save();
  return report;
}

async function deleteReport(id) {
  await Report.findByIdAndDelete(id);
}

module.exports = {
  getReports,
  createReport,
  deleteReport
};
