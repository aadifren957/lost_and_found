const mongoose = require("mongoose");

const matchRequestSchema = new mongoose.Schema({
    lostItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LostItem",
        required: true
    },
    foundItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoundItem",
        required: true
    },
    score: {
        type: Number,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("MatchRequest", matchRequestSchema);