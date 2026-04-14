// One-off: compute embeddings for any LostItem / FoundItem documents
// that don't have one yet. Run with:  node backfillEmbeddings.js
//
// Safe to run multiple times — it only touches docs with empty embeddings.

require("dotenv").config();
const mongoose = require("mongoose");

const LostItem = require("./models/LostItem");
const FoundItem = require("./models/FoundItem");
const { getItemEmbedding } = require("./utils/aiMatcher");

async function backfill(Model, label) {
    const docs = await Model.find({
        $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
    });
    console.log(`📦 ${label}: ${docs.length} items need embeddings`);

    let ok = 0;
    for (const doc of docs) {
        const emb = await getItemEmbedding(doc);
        if (emb) {
            doc.embedding = emb;
            await doc.save();
            ok++;
            console.log(`  ✅ ${doc.title || doc._id}`);
        } else {
            console.log(`  ❌ failed: ${doc.title || doc._id}`);
        }
    }
    console.log(`✅ ${label}: ${ok}/${docs.length} embedded\n`);
}

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB\n");

        await backfill(LostItem, "LostItem");
        await backfill(FoundItem, "FoundItem");

        await mongoose.disconnect();
        console.log("✅ Done");
    } catch (err) {
        console.error("❌ Backfill failed:", err);
        process.exit(1);
    }
})();
