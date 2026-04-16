const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const name = profile.displayName;
        const profilePic = profile.photos[0].value;

        // 1. Check if user already exists with this Google ID
        let user = await User.findOne({ googleId });

        if (user) {
            return done(null, user);
        }

        // 2. Check if user exists with this email (Account Linking)
        user = await User.findOne({ email });

        if (user) {
            // Link Google account to existing email account
            user.googleId = googleId;
            if (!user.profilePic) user.profilePic = profilePic;
            user.isVerified = true; // Google verifies the email
            await user.save();
            return done(null, user);
        }

        // 3. Create new user if neither exists
        user = new User({
            name,
            email,
            googleId,
            profilePic,
            isVerified: true,
            authType: "google"
        });

        await user.save();
        done(null, user);

    } catch (error) {
        done(error, null);
    }
}));

// Serialization for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});
