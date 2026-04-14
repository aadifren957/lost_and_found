// One-off cleanup script. Run with:  node cleanup.js
// Wipes all LostItems, FoundItems, and the old Matches collection
// (if it still exists) so you can start fresh.

require("dotenv").config();
const mongoose = require("mongoose");

const LostItem = require("./models/LostItem");
const FoundItem = require("./models/FoundItem");

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        const lost = await LostItem.deleteMany({});
        const found = await FoundItem.deleteMany({});

        // Drop the legacy "matches" collection directly, in case it lingers.
        let droppedMatches = 0;
        try {
            const coll = mongoose.connection.collection("matches");
            const res = await coll.deleteMany({});
            droppedMatches = res.deletedCount || 0;
        } catch (e) {
            // collection might not exist — that's fine
        }

        console.log(`🗑️  Deleted ${lost.deletedCount} lost items`);
        console.log(`🗑️  Deleted ${found.deletedCount} found items`);
        console.log(`🗑️  Deleted ${droppedMatches} legacy matches`);

        await mongoose.disconnect();
        console.log("✅ Done");
    } catch (err) {
        console.error("❌ Cleanup failed:", err);
        process.exit(1);
    }
})();
