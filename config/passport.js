import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/userModel.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/user/auth/google/callback",


      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("No email found from Google"), null);
        }

        if (!email.toLowerCase().trim().endsWith("@gmail.com")) {
          return done(new Error("Only @gmail.com email accounts are allowed"), null);
        }

        //  Get HD profile image
        let image = profile.photos?.[0]?.value || "";

        if (image) {
          image = image.replace("s96-c", "s400-c");
        }

        // Find existing user by Google ID first
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // Update profile image if needed
          if (image && (!user.profileImage || user.profileImage.includes('googleusercontent.com'))) {
            user.profileImage = image;
          }
          if (!user.fullname) {
            user.fullname = profile.displayName;
          }
          await user.save();
          return done(null, user);
        }

        // If not found by Google ID, check if user exists by email (local auth)
        user = await User.findOne({ email });

        if (user) {
          // Always sync Google data
          user.googleId = profile.id;

          // Only update the profile image if the user doesn't have one 
          // OR if their current image is also from Google (to keep it fresh).
          // This prevents overwriting custom Cloudinary uploads.
          if (image && (!user.profileImage || user.profileImage.includes('googleusercontent.com'))) {
            user.profileImage = image;
          }

          if (!user.fullname) {
            user.fullname = profile.displayName;
          }

          await user.save();
          return done(null, user);
        }

        //  Create new user
        user = new User({
          fullname: profile.displayName,
          email: email,
          googleId: profile.id,
          profileImage: image,
        });

        await user.save();
        return done(null, user);

      } catch (error) {
        console.log("Google Auth Error:", error);
        return done(error, null);
      }
    }
  )
);

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

//  Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;