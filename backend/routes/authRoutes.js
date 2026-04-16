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
router.get("/google/callback", 
    passport.authenticate("google", { failureRedirect: "/login", session: false }),
    (req, res) => {
        // 🔥 Generate JWT for the authenticated user
        const user = req.user;
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // 🔥 Redirect to frontend with token in URL
        // Using http://127.0.0.1:5501 which is the common Live Server port, or index.html
        res.redirect(`${process.env.FRONTEND_URL}/index.html?token=${token}`);
    }
);

module.exports = router;