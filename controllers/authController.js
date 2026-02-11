import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/sendEmail.js';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import * as bcryptjs from 'bcryptjs';


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Please add all fields' });
        }

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number' });
        }


        const userExists = await User.findOne({ email });
        if (userExists) {
            if (!userExists.isVerified && userExists.password) {
                // User exists but not verified (maybe prev attempt). Resend OTP?
                // For now, let's treat exists as exists.
            }
            return res.status(400).json({ error: 'User already exists' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins

        // Hash password
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);

        // Create user (unverified)
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            otp,
            otpExpires,
            isVerified: false
        });

        // Send email
        const message = `Your OTP for Money Manager registration is: ${otp}`;
        await sendEmail({
            email: user.email,
            subject: 'Money Manager Registration OTP',
            message,
        });
        res.status(201).json({
            message: 'OTP sent to email',
            email: user.email
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ error: 'OTP expired' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await bcryptjs.compare(password, user.password))) {
            if (!user.isVerified) {
                return res.status(401).json({ error: 'Email not verified. Please register again.' });
                // Or handle resend logic
            }
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        // Note: For dev without valid Client ID, this might fail unless mocked or configured.
        // We will try standard verify.
        let payload;
        try {
            const ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch (e) {
            // Fallback for dev/demo if mocking or if configured to skip validation for testing?
            // User requested "implement logic". We implement proper logic.
            // If it fails due to config, that's expected environment issue.
            return res.status(401).json({ error: 'Invalid Google Token' });
        }

        const { email, name, sub: googleId } = payload;

        let user = await User.findOne({ email });

        if (user) {
            // Update googleId if not present (linking accounts)
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            // Create new user from Google
            user = await User.create({
                name,
                email,
                googleId,
                isVerified: true,
                password: crypto.randomBytes(16).toString('hex') // random password
            });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.password && user.googleId) {
            return res.status(400).json({ error: 'This account uses Google Login. Please use Google to sign in.' });
        }

        // Generate secure token and 6-digit OTP
        const token = crypto.randomBytes(32).toString('hex');
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Create PasswordReset record (expires in 1 year per user's prompt request, but the plan said 1 hour for better security - user prompt specifically said "within 1 year" in one place and "15 min" in another. Wait, looking at current check and prompt: "expiresAt (1 year from creation)". I will follow the explicit requirement in the last detailed prompt.)
        await PasswordReset.create({
            userId: user._id,
            token,
            otp,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        });

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

        // Send email with link and OTP
        const message = `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your Money Manager account.</p>
            <p>Your OTP is: <strong>${otp}</strong></p>
            <p>Alternatively, click the link below to reset your password:</p>
            <a href="${resetUrl}" style="padding: 10px 20px; background-color: #004000; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            <p>This link and OTP will expire in 1 year.</p>
        `;

        await sendEmail({
            email: user.email,
            subject: 'Money Manager Password Reset',
            message,
        });

        res.json({ message: 'Reset link and OTP sent to email' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const validateResetToken = async (req, res) => {
    try {
        const { token } = req.query;

        const resetRecord = await PasswordReset.findOne({
            token,
            used: false,
            expiresAt: { $gt: Date.now() }
        }).populate('userId', 'email');

        if (!resetRecord) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        res.json({ email: resetRecord.userId.email });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, token, newPassword } = req.body;

        let resetRecord;
        if (token) {
            // Token-based reset from link
            resetRecord = await PasswordReset.findOne({
                token,
                used: false,
                expiresAt: { $gt: Date.now() }
            });
        } else {
            // Email/OTP based reset from UI
            const user = await User.findOne({ email });
            if (!user) return res.status(404).json({ error: 'User not found' });

            resetRecord = await PasswordReset.findOne({
                userId: user._id,
                otp,
                used: false,
                expiresAt: { $gt: Date.now() }
            });
        }

        if (!resetRecord) {
            return res.status(400).json({ error: 'Invalid or expired reset details' });
        }

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number' });
        }

        const user = await User.findById(resetRecord.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Hash new password
        const salt = await bcryptjs.genSalt(10);
        user.password = await bcryptjs.hash(newPassword, salt);
        await user.save();

        // Mark token as used
        resetRecord.used = true;
        await resetRecord.save();

        res.json({ message: 'Password reset successful. You can now login.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export const verifyPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user._id;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user has a password (not Google-only account)
        if (!user.password) {
            return res.status(400).json({ error: 'This account uses Google Login and has no password' });
        }

        // Verify password
        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        res.json({ message: 'Password verified successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export const getMe = async (req, res) => {

    res.json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
    });
};

