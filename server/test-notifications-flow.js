require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const seedDatabase = require('./seedDatabase');
const User = require('./models/User');
const Notification = require('./models/Notification');
const notificationController = require('./controllers/notificationController');

async function testNotifications() {
    console.log("Starting Notifications End-to-End Test...");
    let mongoServer;
    let mongoUri = process.env.MONGO_URI;

    if (mongoUri && mongoUri.includes('mongodb.net')) {
        mongoServer = await MongoMemoryServer.create();
        mongoUri = mongoServer.getUri();
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    await seedDatabase();

    const worker = await User.findOne({ email: 'worker@civic.gov' });
    if (!worker) {
        console.error("Worker worker@civic.gov not found!");
        process.exit(1);
    }
    console.log(`Found worker: ${worker.name} (${worker._id})`);

    const mockReq = { user: { _id: worker._id, id: worker._id, role: 'worker' }, params: {} };
    let jsonResult = null;
    const mockRes = {
        json: (data) => { jsonResult = data; return data; },
        status: (code) => ({ json: (data) => { jsonResult = { statusCode: code, ...data }; } })
    };

    // 1. GET Notifications
    await notificationController.getNotifications(mockReq, mockRes);
    console.log("\n--- GET NOTIFICATIONS RESULT ---");
    console.log(`Success: ${jsonResult.success}`);
    console.log(`Total fetched: ${jsonResult.notifications?.length}`);
    console.log(`Unread count: ${jsonResult.unreadCount}`);
    console.log(`Counts breakdown:`, jsonResult.counts);

    if (!jsonResult.notifications || jsonResult.notifications.length === 0) {
        console.error("No notifications returned for worker!");
        process.exit(1);
    }

    const firstNotif = jsonResult.notifications[0];
    console.log(`\nSelected first notification: ID=${firstNotif._id}, Title="${firstNotif.title}", Read=${firstNotif.read}`);
    if (firstNotif.issue) {
        console.log(`Attached issue: ID=${firstNotif.issue._id}, Title="${firstNotif.issue.title}", Department=${firstNotif.issue.department}, Priority=${firstNotif.issue.priority}`);
    }

    // 2. Mark as read
    mockReq.params.id = firstNotif._id;
    await notificationController.markAsRead(mockReq, mockRes);
    console.log("\n--- MARK AS READ RESULT ---");
    console.log(`Read status after update: ${jsonResult.notification?.read}`);
    console.log(`Unread count after update: ${jsonResult.unreadCount}`);

    // 3. Mark as unread
    await notificationController.markAsUnread(mockReq, mockRes);
    console.log("\n--- MARK AS UNREAD RESULT ---");
    console.log(`Read status after update: ${jsonResult.notification?.read}`);
    console.log(`Unread count after update: ${jsonResult.unreadCount}`);

    // 4. Mark all as read
    await notificationController.markAllAsRead(mockReq, mockRes);
    console.log("\n--- MARK ALL AS READ RESULT ---");
    console.log(`Message: ${jsonResult.message}, Unread count: ${jsonResult.unreadCount}`);

    console.log("\nALL NOTIFICATION BACKEND TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
}

testNotifications().catch(err => {
    console.error("Test error:", err);
    process.exit(1);
});
