const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const OTP = require("../models/OTP");
const { sendOTPEmail, sendWelcomeEmail } = require("../utils/emailUtils");
const { isValidOrganizationEmail } = require("../utils/validateUtils");

// Get Profile
exports.getProfile = async (req, res) => 
    {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json(user);
    } catch (error) {
        console.error("GET PROFILE ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};

// Send OTP
exports.sendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // 🛡️ CHECK CONFIG (Helpful for debugging)
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error("CRITICAL: Email credentials not configured in .env");
            return res.status(500).json({ 
                message: "Email service not configured. Please add EMAIL_USER and EMAIL_PASS to environment variables." 
            });
        }

        // Domain Restriction Check
        if (!isValidOrganizationEmail(email)) {
            return res.status(400).json({ message: "You are not from this organization!" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already registered with this email" });
        }

        // Generate 6-digit OTP
        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        });

        // Save to DB (upsert)
        await OTP.findOneAndUpdate(
            { email },
            { otp, createdAt: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Send Email
        await sendOTPEmail(email, otp);

        res.status(200).json({ message: "OTP sent successfully to your email" });

    } catch (error) {
        console.error("SEND OTP ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};

// Signup
exports.signup = async (req, res) => {
    try {
        const { name, email, password, otp } = req.body;

        if (!name || !email || !password || !otp) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Domain Restriction Check (Final Safety)
        if (!isValidOrganizationEmail(email)) {
            return res.status(400).json({ message: "You are not from this organization!" });
        }

        // 1. Verify OTP
        const otpRecord = await OTP.findOne({ email });
        if (!otpRecord || otpRecord.otp !== otp) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // 2. Check if user exists (Double check)
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Create User
        user = new User({
            name,
            email,
            password: hashedPassword,
            isVerified: true, // Mark as verified since OTP matched
            authType: "manual"
        });

        await user.save();

        // 5. Delete OTP record
        await OTP.deleteOne({ email });

        // 6. Send Welcome Email
        await sendWelcomeEmail(email, name);

        res.status(201).json({ message: "User registered successfully" });

    } catch (error) {
        console.error("SIGNUP ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        console.log("Login attempt for:", req.body.email);
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Domain Restriction Check
        if (!isValidOrganizationEmail(email)) {
            return res.status(400).json({ message: "You are not from this organization!" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Check if user has a password (might be a Google-only user)
        if (!user.password) {
            return res.status(400).json({ message: "This account uses Google login. Please use the 'Continue with Google' button." });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        // 🔥 GENERATE TOKEN HERE
        if (!process.env.JWT_SECRET) {
            console.error("CRITICAL: JWT_SECRET is not defined in .env");
            return res.status(500).json({ message: "Server configuration error" });
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // 🔥 SEND TOKEN IN RESPONSE
        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};