const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: function() { return !this.googleId; } // Only required if not using Google
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true // Allows multiple null values for non-Google users
    },
    profilePic: {
        type: String
    },
    role: {
        type: String,
        default: "user"
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    authType: {
        type: String,
        enum: ["manual", "google"],
        default: "manual"
    },
    // ✅ HONESTY SCORE SYSTEM
    honestyScore: {
        type: Number,
        default: 0,
        min: 0
    },
    currentBadge: {
        type: String,
        enum: ["Beginner Helper", "Trusted Contributor", "Campus Guardian", "Platinum Honest User"],
        default: "Beginner Helper"
    },
    totalReturnedItems: {
        type: Number,
        default: 0,
        min: 0
    },
    scoreHistory: [{
        date: {
            type: Date,
            default: Date.now
        },
        action: String, // "report_verified", "report_rejected", etc.
        pointsAwarded: Number,
        foundItemId: mongoose.Schema.Types.ObjectId,
        description: String
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);