const mongoose = require("mongoose");

const lostItemSchema = new mongoose.Schema({
    title: String,
    description: String,
    category: String,
    location: String,
    date: Date,
    image: String,
    reportedBy: String,
    status: {
        type: String,
        default: "lost"
    },
    embedding: {
        type: [Number],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model("LostItem", lostItemSchema);