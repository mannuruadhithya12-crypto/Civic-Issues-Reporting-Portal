const fs = require('fs');
const csvParser = require('csv-parser');
const PublicHistoricalIncident = require('../models/PublicHistoricalIncident');
const Issue = require('../models/Issue');
const InterventionOutcome = require('../models/InterventionOutcome');
const { DEPARTMENTS: CATEGORIES } = require('../config/departments');

// Deterministic category mapping based on user requirements
const CATEGORY_MAPPING = {
  "Pothole": "Potholes",
  "Potholes": "Potholes",
  "Garbage": "Garbage overflow",
  "Sanitation": "Garbage overflow",
  "Street Light": "Streetlight failures",
  "Drainage": "Drainage issues",
  "Water Leak": "Water leakage",
  "Parking": "Illegal parking",
  "Noise": "Noise pollution",
  "Sewage": "Sewage problems",
  "Safety": "Public safety issues",
  "Other": "Other"
};

const mapCategory = (sourceCat) => {
  if (!sourceCat) return { mapped: null, status: 'UNKNOWN' };
  
  // Try exact match in known CivicConnect categories first
  if (CATEGORIES.includes(sourceCat)) {
    return { mapped: sourceCat, status: 'MAPPED' };
  }
  
  // Try mapping dictionary
  const mappedCat = CATEGORY_MAPPING[sourceCat];
  if (mappedCat && CATEGORIES.includes(mappedCat)) {
    return { mapped: mappedCat, status: 'MAPPED' };
  }

  // Try case-insensitive mapping
  for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
    if (key.toLowerCase() === sourceCat.toLowerCase()) {
      return { mapped: value, status: 'MAPPED' };
    }
  }

  return { mapped: null, status: 'UNKNOWN' };
};

const parseFile = async (file) => {
  return new Promise((resolve, reject) => {
    const results = [];
    if (file.mimetype === 'application/json') {
      try {
        const fileContent = fs.readFileSync(file.path, 'utf8');
        const json = JSON.parse(fileContent);
        if (Array.isArray(json)) {
          resolve(json);
        } else if (json.data && Array.isArray(json.data)) {
           resolve(json.data);
        } else if (json.records && Array.isArray(json.records)) {
           resolve(json.records);
        } else {
           reject(new Error("Invalid JSON structure: Expected an array of records."));
        }
      } catch (err) {
        reject(new Error("Failed to parse JSON file"));
      }
    } else if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      fs.createReadStream(file.path)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (err) => reject(new Error("Failed to parse CSV file")));
    } else {
      reject(new Error("Unsupported file format. Please upload JSON or CSV."));
    }
  });
};

const validateAndMapRecord = (record) => {
  const sourceRecordId = record.sourceRecordId || record.id || record.RecordID;
  const reportedAt = record.reportedAt || record.createdAt || record.CreatedDate;
  const categoryRaw = record.category || record.issueType || record.ComplaintType;
  const description = record.description || record.details || record.Descriptor;

  let isValid = true;
  const missingFields = [];

  if (!sourceRecordId) { isValid = false; missingFields.push('sourceRecordId'); }
  if (!reportedAt) { isValid = false; missingFields.push('reportedAt'); }
  if (!categoryRaw) { isValid = false; missingFields.push('category'); }
  if (!description) { isValid = false; missingFields.push('description'); }

  const { mapped: mappedCat, status: catStatus } = mapCategory(categoryRaw);
  
  let latitude = record.latitude || record.Latitude;
  let longitude = record.longitude || record.Longitude;
  
  if (latitude) latitude = parseFloat(latitude);
  if (longitude) longitude = parseFloat(longitude);
  
  if (latitude !== undefined && (isNaN(latitude) || latitude < -90 || latitude > 90)) {
     isValid = false;
     missingFields.push('invalid_latitude');
  }
  if (longitude !== undefined && (isNaN(longitude) || longitude < -180 || longitude > 180)) {
     isValid = false;
     missingFields.push('invalid_longitude');
  }

  // Parse dates
  let parsedReportedAt = null;
  if (reportedAt) {
      parsedReportedAt = new Date(reportedAt);
      if (isNaN(parsedReportedAt.getTime())) {
          isValid = false;
          missingFields.push('invalid_reportedAt');
      }
  }

  let parsedClosedAt = null;
  const closedAtRaw = record.closedAt || record.ClosedDate;
  if (closedAtRaw) {
      parsedClosedAt = new Date(closedAtRaw);
      if (isNaN(parsedClosedAt.getTime())) parsedClosedAt = null;
  }

  return {
    isValid,
    missingFields,
    record: {
      sourceRecordId: sourceRecordId ? String(sourceRecordId) : null,
      reportedAt: parsedReportedAt,
      closedAt: parsedClosedAt,
      category: mappedCat || 'Other',
      sourceCategory: categoryRaw,
      categoryMappingStatus: catStatus,
      description,
      department: mappedCat || 'Other', // using category as department for CivicConnect 
      sourceDepartment: record.department || record.Agency,
      departmentMappingStatus: catStatus, // reuse cat status since they map 1:1 here
      status: record.status || 'closed',
      latitude: latitude || undefined,
      longitude: longitude || undefined,
      locationText: record.locationText || record.Address || record.IncidentAddress,
      resolutionDescription: record.resolutionDescription || record.ResolutionDescription,
      rawSourceMetadata: record
    }
  };
};


exports.previewDataset = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const rawRecords = await parseFile(req.file);
    
    // Limits
    if (rawRecords.length > 5000) {
       return res.status(400).json({ message: "File exceeds maximum allowed records (5000)" });
    }

    const { sourceName, sourceDataset } = req.body;
    if (!sourceName || !sourceDataset) {
        return res.status(400).json({ message: "sourceName and sourceDataset are required" });
    }

    const report = {
      totalRecords: rawRecords.length,
      validRecords: 0,
      invalidRecords: 0,
      duplicateRecords: 0,
      unknownCategories: 0,
      unknownDepartments: 0,
      missingFields: {},
      sampleRecords: []
    };

    // Keep track of IDs in the file to detect duplicates within the upload
    const seenIdsInFile = new Set();
    const sourceRecordIds = [];

    const processedRecords = rawRecords.map(raw => {
       const mapped = validateAndMapRecord(raw);
       if (mapped.isValid) {
           sourceRecordIds.push(mapped.record.sourceRecordId);
       }
       return mapped;
    });

    // Check DB for existing records
    const existingRecords = await PublicHistoricalIncident.find({
        sourceName,
        sourceDataset,
        sourceRecordId: { $in: sourceRecordIds }
    }).select('sourceRecordId').lean();

    const existingIds = new Set(existingRecords.map(r => r.sourceRecordId));

    processedRecords.forEach((item, index) => {
       if (!item.isValid) {
           report.invalidRecords++;
           item.missingFields.forEach(field => {
              report.missingFields[field] = (report.missingFields[field] || 0) + 1;
           });
       } else {
           // check dupes
           if (existingIds.has(item.record.sourceRecordId) || seenIdsInFile.has(item.record.sourceRecordId)) {
               report.duplicateRecords++;
           } else {
               report.validRecords++;
               seenIdsInFile.add(item.record.sourceRecordId);
               
               if (item.record.categoryMappingStatus === 'UNKNOWN') report.unknownCategories++;
               if (item.record.departmentMappingStatus === 'UNKNOWN') report.unknownDepartments++;

               if (report.sampleRecords.length < 5) {
                   report.sampleRecords.push(item.record);
               }
           }
       }
    });

    // Clean up temp file
    if (req.file.path) fs.unlinkSync(req.file.path);

    res.json(report);
  } catch (error) {
    if (req.file && req.file.path) fs.unlinkSync(req.file.path);
    console.error("Preview error:", error);
    res.status(500).json({ message: error.message || "Failed to preview dataset" });
  }
};


exports.uploadDataset = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { sourceName, sourceDataset, sourceUrl } = req.body;
    if (!sourceName || !sourceDataset) {
        return res.status(400).json({ message: "sourceName and sourceDataset are required" });
    }

    const rawRecords = await parseFile(req.file);
    if (rawRecords.length > 5000) {
       return res.status(400).json({ message: "File exceeds maximum allowed records (5000)" });
    }

    const seenIdsInFile = new Set();
    const recordsToInsert = [];
    const report = { recordsReceived: rawRecords.length, recordsImported: 0, recordsSkipped: 0, duplicates: 0, invalidRecords: 0, unknownMappings: 0 };

    // Pass 1: Validate
    for (const raw of rawRecords) {
        const item = validateAndMapRecord(raw);
        if (!item.isValid) {
            report.invalidRecords++;
            report.recordsSkipped++;
        } else {
            if (seenIdsInFile.has(item.record.sourceRecordId)) {
               report.duplicates++;
               report.recordsSkipped++;
            } else {
               seenIdsInFile.add(item.record.sourceRecordId);
               recordsToInsert.push({
                   ...item.record,
                   sourceName,
                   sourceDataset,
                   sourceUrl,
                   importedAt: new Date()
               });
               if (item.record.categoryMappingStatus === 'UNKNOWN') report.unknownMappings++;
            }
        }
    }

    // Pass 2: DB deduplication and insert using unordered bulkWrite
    if (recordsToInsert.length > 0) {
        const bulkOps = recordsToInsert.map(record => ({
            updateOne: {
                filter: { 
                    sourceName: record.sourceName, 
                    sourceDataset: record.sourceDataset, 
                    sourceRecordId: record.sourceRecordId 
                },
                update: { $setOnInsert: record },
                upsert: true
            }
        }));

        const result = await PublicHistoricalIncident.bulkWrite(bulkOps, { ordered: false });
        report.recordsImported = result.upsertedCount;
        report.duplicates += (recordsToInsert.length - result.upsertedCount);
        report.recordsSkipped += (recordsToInsert.length - result.upsertedCount);
    }

    if (req.file.path) fs.unlinkSync(req.file.path);

    res.json(report);
  } catch (error) {
    if (req.file && req.file.path) fs.unlinkSync(req.file.path);
    console.error("Upload error:", error);
    res.status(500).json({ message: error.message || "Failed to upload dataset" });
  }
};


exports.getStats = async (req, res) => {
    try {
        const publicHistoricalIncidents = await PublicHistoricalIncident.countDocuments();
        
        // Count total CivicConnect Live issues (NOT simulation)
        // In this architecture, assuming all Issues are live unless marked as simulation 
        // We'll just count total Issues (or exclude ones marked source: 'SIMULATION')
        const civicConnectLiveIncidents = await Issue.countDocuments(); 

        const evaluatedLiveOutcomes = await InterventionOutcome.countDocuments();
        const rlEligibleTransitions = await InterventionOutcome.countDocuments({ trainingEligible: true });

        // Get diversity stats
        const unknownCategories = await PublicHistoricalIncident.countDocuments({ categoryMappingStatus: 'UNKNOWN' });
        const unknownDepartments = await PublicHistoricalIncident.countDocuments({ departmentMappingStatus: 'UNKNOWN' });

        const categoriesAggregation = await PublicHistoricalIncident.aggregate([
            { $group: { _id: "$category" } }
        ]);
        
        const departmentsAggregation = await PublicHistoricalIncident.aggregate([
            { $group: { _id: "$department" } }
        ]);

        const dateRangeAggr = await PublicHistoricalIncident.aggregate([
            { $group: { _id: null, minDate: { $min: "$reportedAt" }, maxDate: { $max: "$reportedAt" } } }
        ]);

        let dateCoverageDays = 0;
        if (dateRangeAggr.length > 0 && dateRangeAggr[0].minDate && dateRangeAggr[0].maxDate) {
            const diffTime = Math.abs(dateRangeAggr[0].maxDate - dateRangeAggr[0].minDate);
            dateCoverageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        }

        const rewardsAggr = await InterventionOutcome.aggregate([
            { $match: { trainingEligible: true } },
            { $group: {
                _id: null,
                positive: { $sum: { $cond: [ { $gt: ["$reward", 0] }, 1, 0 ] } },
                negative: { $sum: { $cond: [ { $lt: ["$reward", 0] }, 1, 0 ] } },
                zero: { $sum: { $cond: [ { $eq: ["$reward", 0] }, 1, 0 ] } }
            }}
        ]);

        res.json({
            publicHistoricalIncidents,
            civicConnectLiveIncidents,
            evaluatedLiveOutcomes,
            rlEligibleTransitions,
            categories: categoriesAggregation.length,
            departments: departmentsAggregation.length,
            unknownCategories,
            unknownDepartments,
            dateCoverageDays,
            positiveRewards: rewardsAggr[0]?.positive || 0,
            negativeRewards: rewardsAggr[0]?.negative || 0,
            zeroRewards: rewardsAggr[0]?.zero || 0
        });

    } catch (error) {
        console.error("Stats error:", error);
        res.status(500).json({ message: "Failed to fetch stats" });
    }
};
