const mongoose = require("mongoose");

const foundItemSchema = new mongoose.Schema({
    title: String,
    description: String,
    category: String,
    location: String,
    date: Date,
    image: String,
    reportedBy: String,

    // ✅ UPDATED STATUS FIELD
    status: {
        type: String,
        enum: ["unmatched", "matched", "returned"],
        default: "unmatched"
    },

    embedding: {
        type: [Number],
        default: []
    }

}, { timestamps: true });

module.exports = mongoose.model("FoundItem", foundItemSchema);