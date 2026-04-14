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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);