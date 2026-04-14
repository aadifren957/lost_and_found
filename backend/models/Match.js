const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
    lostItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LostItem",
    },
    foundItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoundItem",
    },
    score: Number
}, { timestamps: true });

module.exports = mongoose.model("Match", matchSchema);
