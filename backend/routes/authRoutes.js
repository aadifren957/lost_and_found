const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");

const { signup, login, getProfile, sendOTP } = require("../controllers/authController");
const { protect: auth } = require("../middleware/authMiddleware");

// Existing Routes
router.post("/signup", signup);
router.post("/send-otp", sendOTP);
router.post("/login", login);
router.get("/profile", auth, getProfile);

// --- GOOGLE AUTH ROUTES ---

// 1. Trigger Google login
router.get("/google", passport.authenticate("google", {
    scope: ["profile", "email"]
}));

// 2. Google Callback
router.get("/google/callback", (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
        // Handle failure
        if (err || !user) {
            const message = info ? info.message : "Authentication failed";
            // Check process.env.FRONTEND_URL, fallback to localhost if missing
            const frontendUrl = process.env.FRONTEND_URL || "http://127.0.0.1:5501";
            return res.redirect(`${frontendUrl}/user-login.html?error=${encodeURIComponent(message)}`);
        }

        // Success: Generate JWT for the authenticated user
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        const frontendUrl = process.env.FRONTEND_URL || "http://127.0.0.1:5501";
        res.redirect(`${frontendUrl}/index.html?token=${token}`);
    })(req, res, next);
});

module.exports = router;