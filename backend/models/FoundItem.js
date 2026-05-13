const mongoose = require("mongoose");

const foundItemSchema = new mongoose.Schema({
    title: String,
    description: String,
    category: String,
    location: String,
    date: Date,
    image: String,
    reportedBy: String,
    reportedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    // ✅ UPDATED STATUS FIELD
    status: {
        type: String,
        enum: ["unmatched", "matched", "returned"],
        default: "unmatched"
    },

    // ✅ VERIFICATION SYSTEM
    verificationStatus: {
        type: String,
        enum: ["Pending", "Verified", "Claimed", "Rejected"],
        default: "Pending"
    },
    
    physicallySubmitted: {
        type: Boolean,
        default: false
    },

    matchedLostItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LostItem"
    },

    rewardGranted: {
        type: Boolean,
        default: false
    },

    adminVerificationNotes: String,
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    verifiedAt: Date,
    rejectionReason: String,

    embedding: {
        type: [Number],
        default: []
    }

}, { timestamps: true });

module.exports = mongoose.model("FoundItem", foundItemSchema);