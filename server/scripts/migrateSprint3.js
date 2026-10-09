// server/scripts/migrateSprint3.js
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Issue = require('../models/Issue');

const migrate = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        const issues = await Issue.find({});
        console.log(`Found ${issues.length} issues to process.`);

        let convertedCount = 0;
        let unmatchedCount = 0;
        let statusUpdatedCount = 0;

        for (const issue of issues) {
            let needsSave = false;

            // 1. Update Status Enum
            const statusMap = {
                'submitted': 'reported',
                'pending-verification': 'resolved'
            };

            if (statusMap[issue.status]) {
                const oldStatus = issue.status;
                issue.status = statusMap[issue.status];
                console.log(`Issue ${issue._id}: Status updated from ${oldStatus} to ${issue.status}`);
                needsSave = true;
                statusUpdatedCount++;
            }

            // 2. Migrate assignedTo from String username to ObjectId
            // Only act if assignedTo is a non-empty string and not already an ObjectId format
            if (issue.assignedTo && typeof issue.assignedTo === 'string' && issue.assignedTo.length < 24) {
                const worker = await User.findOne({ 
                    username: issue.assignedTo, 
                    role: 'worker' 
                });

                if (worker) {
                    // Update field directly using Mongoose $set since we are changing type
                    await Issue.updateOne(
                        { _id: issue._id },
                        { $set: { assignedTo: worker._id } }
                    );
                    console.log(`Issue ${issue._id}: Reassigned from String "${issue.assignedTo}" to ObjectId ${worker._id}`);
                    convertedCount++;
                    // We don't need to save() for this specific field since we used updateOne, 
                    // but we might need to save for status updates.
                    issue.assignedTo = undefined; // clear it so save() doesn't overwrite with string if schema enforces ObjectId
                } else {
                    console.warn(`Issue ${issue._id}: Worker with username "${issue.assignedTo}" not found. Could not convert assignedTo.`);
                    unmatchedCount++;
                }
            }

            if (needsSave) {
                await Issue.updateOne({ _id: issue._id }, { $set: { status: issue.status } });
            }
        }

        console.log("\nMigration completed.");
        console.log(`Status updates: ${statusUpdatedCount}`);
        console.log(`AssignedTo converted to ObjectId: ${convertedCount}`);
        console.log(`AssignedTo unmatched: ${unmatchedCount}`);

        process.exit(0);
    } catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
};

migrate();
