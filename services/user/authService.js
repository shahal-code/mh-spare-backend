import User from "../../models/userModel.js";
import Wallet from "../../models/walletModel.js";
import bcrypt from "bcrypt";
import { sendOtpEmail } from "../../config/nodemailer.js";

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Refferal
 */
const generateReferralCode = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let exists = true;
    while (exists) {
        const random = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        code = `ESPAREHUB${random}`;
        exists = await User.exists({ referralCode: code });
    }
    return code;
};

/**
 * Credits ₹1000 to a users wallet. Creates wallet if it doesnt exist.
 */
const creditWalletBonus = async (userId, description) => {
    await Wallet.findOneAndUpdate(
        { userId },
        {
            $inc: { balance: 1000 },
            $push: {
                transactions: {
                    type: "credit",
                    amount: 1000,
                    description,
                    status: "success"
                }
            }
        },
        { upsert: true, new: true }
    );
};

/**
 * Authenticate user with email and password.
 */
export const login = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found");

    if (user.isBlocked) {
        const err = new Error("Your account has been blocked by an administrator");
        err.isBlocked = true;
        throw err;
    }

    if (!user.password) {
        throw new Error("This account was created with Google. Please use 'Sign in with Google'.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid Password");

    return user;
};

/**
 * Initial signup step: Validate, hash password, validate referral code, and prepare OTP.
 */
export const prepareSignup = async (fullname, email, password, referralCode) => {
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new Error("User already exists");

    // Validate referral code if provided
    if (referralCode && referralCode.trim() !== "") {
        const referrer = await User.findOne({ referralCode: referralCode.trim().toUpperCase() });
        if (!referrer) {
            throw new Error("Invalid referral code. Please check and try again.");
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();

    await sendOtpEmail(email, otp);

    return {
        userData: {
            fullname,
            email,
            password: hashedPassword,
            referredBy: referralCode ? referralCode.trim().toUpperCase() : null
        },
        otp,
        otpExpiry: Date.now() + 60 * 1000
    };
};

/**
 * Create user after OTP verification.
 * - Assigns a unique referral code to the new user.
 * - If they used a referral code, credits ₹1000 to both users' wallets.
 */
export const completeSignup = async (userData) => {
    const { referredBy, ...userFields } = userData;

    // Generate a unique referral code for the new user
    const referralCode = await generateReferralCode();

    const newUser = new User({ ...userFields, referralCode });
    await newUser.save();

    // Process referral bonus if they used a referral code
    if (referredBy) {
        const referrer = await User.findOne({ referralCode: referredBy });
        if (referrer) {
            // Credit ₹1000 to the new user
            await creditWalletBonus(
                newUser._id,
                `Referral signup bonus — you joined using ${referredBy}`
            );
            // Credit ₹1000 to the referrer
            await creditWalletBonus(
                referrer._id,
                `Referral bonus — ${newUser.fullname} joined using your code`
            );
        }
    }

    return newUser;
};

/**
 * Resend OTP.
 */
export const resendOtp = async (email) => {
    const otp = generateOtp();
    await sendOtpEmail(email, otp);
    return {
        otp,
        otpExpiry: Date.now() + 60 * 1000
    };
};

/**
 * Initial forgot password step: Validate and send OTP.
 */
export const preparePasswordReset = async (email) => {
    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found");

    const otp = generateOtp();
    await sendOtpEmail(email, otp);

    return {
        otp,
        otpExpiry: Date.now() + 60 * 1000
    };
};

/**
 * Final reset password step: Update password.
 */
export const resetPassword = async (email, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    return await User.updateOne(
        { email },
        { $set: { password: hashedPassword } }
    );
};

