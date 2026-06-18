import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { User } from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "twin2win_jwt_super_secret_key_112233";

function createMailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 465);

  console.log("SMTP_HOST:", host);
  console.log("SMTP_PORT:", port);
  console.log("SMTP_USER:", user);
  console.log("SMTP_PASS exists:", !!pass);

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: true, // Required for port 465
      family: 4, // Force IPv4
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  throw new Error(
    "SMTP configuration missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS."
  );
}
// Helper function to send email upon registration using nodemailer
async function sendRegistrationEmail(email, name, sport) {
  try {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || "Twin2Win Coach <no-reply@twin2win.ai>";

    const transporter = createMailTransporter();
    if (!host || !user || !pass) {
      // Automatic visual log fallback if SMTP is absent
      console.log(`📡 SMTP NOT CONFIGURATED IN SECRETS. EMAIL CONTENTS LOGGED BELOW:`);
      console.log(`TO: ${email}`);
      console.log(`SUBJECT: Welcome to Twin2Win Athletic Twin Ecosystem! 🏆`);
      console.log(`BODY: Welcome, ${name}! Your digital athletic twin has been initialized for sport: ${sport}.`);
    }

    const info = await transporter.sendMail({
      from,
      to: email,
      subject: "Welcome to Twin2Win Athletic Twin Ecosystem! 🏆",
      text: `Hello ${name}! Welcome to Twin2Win.\n\nYour digital athletic twin profile has been successfully generated for the sport: ${sport}.\n\nLog in now to upload training videos, view dynamic diet proposals, and track your biokinetic analytics.\n\nTo your athletic peaks,\nTwin2Win Elite Advisor`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; border-radius: 8px; font-weight: bold; font-size: 18px;">
              🏆 Twin2Win
            </div>
          </div>
          <h2 style="color: #1e3a8a; text-align: center;">Welcome to the Digital Twin Ecosystem, ${name}!</h2>
          <p style="color: #475569; line-height: 1.6; font-size: 14px;">Your elite sports science digital twin profile is now active and ready for athletic biokinetic analysis.</p>
          <div style="background-color: #f8fafc; padding: 18px; border-radius: 12px; margin: 24px 0; border-left: 5px solid #2563eb; font-size: 14px; color: #334155;">
            <strong style="color: #1e3a8a;">Discipline Category:</strong> ${sport}<br />
            <strong style="color: #1e3a8a;">Account twin verified:</strong> True<br />
            <strong style="color: #1e3a8a;">Status:</strong> Awaiting motion video telemetry
          </div>
          <p style="color: #475569; line-height: 1.6; font-size: 14px;">Upload a workout or running motion clip under the <strong>AI Coach</strong> view in your dashboard. Our deep biokinetic engine will extract your velocity, cardiovascular recovery threshold, fatigue index, and sync them immediately.</p>
          <p style="color: #475569; line-height: 1.6; font-size: 14px;"><strong>Personalized Nutrition & Training plans:</strong> The system will automatically build a customized daily Diet Plan and specialized training recommendations matched to your athletic output state.</p>
          <p style="color: #94a3b8; font-size: 11px; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
            Twin2Win Precision Sports Science Platform • Autonomous Twin Advisory System
          </p>
        </div>
      `
    });

    console.log("📨 Registration email has been successfully processed:", info.messageId);
    return true;
  } catch (error) {
    console.warn("⚠️ Nodemailer register email process encountered warning/error:", error.message);
    return false;
  }
}

const router = express.Router();

// In-Memory Fallback Store (for when MongoDB connection is not established)
const localUsers = [
  {
    _id: "60d000000000000000000001",
    name: "Usain Bolt",
    email: "usain@example.com",
    password: "$2a$10$X8K7BvN4q0q9C6pT8WyeWeSgXqgQ.gCOK7eXmX4r57wT/WbI0nXeG", // Hashed "password"
    age: 35,
    gender: "Male",
    height: 195,
    weight: 94,
    sport: "Running",
    createdAt: new Date()
  }
];

// Middleware to authenticate JWT
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

// REGISTER ENDPOINT
const pendingOtps = {}; // Email -> { otp, expiresAt, action }

// Real OTP dispatch endpoint
router.post("/send-otp", async (req, res) => {
  try {
    const { email, action } = req.body; // action: "register" | "login"
    if (!email || !action) {
      return res.status(400).json({ error: "Email and verification purpose are required" });
    }

    const lowerEmail = email.toLowerCase().trim();
    const isDbConnected = mongoose.connection.readyState === 1;

    // Validate account status relative to action requested
    let userExists = false;
    if (isDbConnected) {
      const dbUser = await User.findOne({ email: lowerEmail });
      if (dbUser) userExists = true;
    } else {
      const offlineUser = localUsers.find(u => u.email === lowerEmail);
      if (offlineUser) userExists = true;
    }

    if (action === "register" && userExists) {
      return res.status(400).json({ error: "Account already registered under this email" });
    }

    if (action === "login" && !userExists) {
      return res.status(400).json({ error: "No player profile exists with this email" });
    }

    // Generate highly safe 6-digit cryptographic-like OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    pendingOtps[lowerEmail] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes validity
      action
    };

    // Logging OTP to terminal for high visibility and reliable local testing
    console.log(`\n🔑 [OTP VERIFICATION SYSTEM] Generated code ${otp} for email ${lowerEmail} [${action.toUpperCase()}]`);

    // Prepare credentials for Mail dispatch
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || '"Twin2Win System Support" <no-reply@twin2win.net>';

    const transporter = createMailTransporter();

    const actionText = action === "register" ? "registering a new sports twin" : "completing account sign-in";
    await transporter.sendMail({
      from,
      to: lowerEmail,
      subject: `🏆 Verify Twin2Win Account - Code: ${otp}`,
      text: `Hello athlete!\n\nUse the following confidential 6-digit OTP code for ${actionText}:\n\n➡️ Code: ${otp}\n\nNote: This verification code expires in 5 minutes.\n\nKeep verifying,\nTwin2Win Digital Twin Hub`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <div style="background-color: #1e3a8a; padding: 25px; text-align: center; color: #ffffff;">
            <span style="font-size: 24px; font-weight: 900; letter-spacing: 1.5px;">🏆 TWIN2WIN SYSTEM</span>
          </div>
          <div style="padding: 25px; text-align: center; background-color: #ffffff;">
            <h2 style="color: #0f172a; margin-top: 0;">Instant Security Validation</h2>
            <p style="color: #475569; font-size: 14.5px; line-height: 1.6;">You requested verified authorization for <strong>${actionText}</strong>. Input this code into the portal screen:</p>
            
            <div style="background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 16px; margin: 24px 0; display: inline-block; min-width: 220px;">
              <span style="font-size: 34px; font-weight: 900; letter-spacing: 6px; color: #1e3a8a; font-family: monospace;">${otp}</span>
            </div>
            
            <p style="color: #64748b; font-size: 11.5px; margin-bottom: 0;">Expires in <strong>5 minutes</strong>. If you did not trigger this profile authentication, discard this notice safely.</p>
          </div>
        </div>
      `
    });

    return res.json({ success: true, message: "Real OTP generated and emailed successfully." });
  } catch (error) {
    console.error("OTP generation error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// PASSWORDSLESS LOGIN VERIFY
router.post("/verify-login-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Both registered email and 6-digit OTP code are required" });
    }

    const lowerEmail = email.toLowerCase().trim();
    const pending = pendingOtps[lowerEmail];

    if (!pending || pending.otp !== otp || pending.expiresAt < Date.now() || pending.action !== "login") {
      return res.status(400).json({ error: "Invalid, incorrect, or expired login verification code." });
    }

    // Clear utilized OTP code
    delete pendingOtps[lowerEmail];

    const isDbConnected = mongoose.connection.readyState === 1;
    let userObj = null;

    if (isDbConnected) {
      userObj = await User.findOne({ email: lowerEmail });
    } else {
      userObj = localUsers.find(u => u.email === lowerEmail);
    }

    if (!userObj) {
      return res.status(404).json({ error: "Athlete profile was not found" });
    }

    const token = jwt.sign(
      { userId: (userObj._id || userObj.id).toString(), email: userObj.email, name: userObj.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: userObj._id || userObj.id,
        name: userObj.name,
        email: userObj.email,
        age: userObj.age,
        gender: userObj.gender,
        height: userObj.height,
        weight: userObj.weight,
        sport: userObj.sport
      },
      storageType: isDbConnected ? "MongoDB Cloud" : "Local In-Memory Fallback (Database Offline)"
    });
  } catch (error) {
    console.error("OTP Login Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, age, gender, height, weight, sport, password, otp } = req.body;

    if (!name || !email || !age || !gender || !height || !weight || !sport || !password || !otp) {
      return res.status(400).json({ error: "All fields including confirmation OTP code are required" });
    }

    const lowerEmail = email.toLowerCase().trim();
    const pending = pendingOtps[lowerEmail];

    if (!pending || pending.otp !== otp || pending.expiresAt < Date.now() || pending.action !== "register") {
      return res.status(400).json({ error: "Invalid, incorrect, or expired registration OTP code. Please request a new one." });
    }

    // Delete verified code
    delete pendingOtps[lowerEmail];

    const hashedPassword = await bcrypt.hash(password, 10);
    const isDbConnected = mongoose.connection.readyState === 1;


    // Check if user already exists
    if (isDbConnected) {
      const existingUser = await User.findOne({ email: lowerEmail });
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const newUser = new User({
        name,
        email: lowerEmail,
        password: hashedPassword,
        age: Number(age),
        gender,
        height: Number(height),
        weight: Number(weight),
        sport
      });

      await newUser.save();

      // Trigger user registration email asynchronously
      sendRegistrationEmail(lowerEmail, name, sport).catch(err => {
        console.error("Async email dispatch error:", err);
      });

      const token = jwt.sign(
        { userId: newUser._id.toString(), email: newUser.email, name: newUser.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(201).json({
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          age: newUser.age,
          gender: newUser.gender,
          height: newUser.height,
          weight: newUser.weight,
          sport: newUser.sport
        },
        storageType: "MongoDB Cloud"
      });
    } else {
      // Local In-Memory Auth Fallback
      const existingUser = localUsers.find(u => u.email === lowerEmail);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered in local sandbox" });
      }

      const tempId = new mongoose.Types.ObjectId().toString();
      const newUser = {
        _id: tempId,
        name,
        email: lowerEmail,
        password: hashedPassword,
        age: Number(age),
        gender,
        height: Number(height),
        weight: Number(weight),
        sport,
        createdAt: new Date()
      };

      localUsers.push(newUser);

      // Trigger user registration email asynchronously
      sendRegistrationEmail(lowerEmail, name, sport).catch(err => {
        console.error("Async email dispatch error:", err);
      });

      const token = jwt.sign(
        { userId: tempId, email: newUser.email, name: newUser.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(201).json({
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          age: newUser.age,
          gender: newUser.gender,
          height: newUser.height,
          weight: newUser.weight,
          sport: newUser.sport
        },
        storageType: "Local In-Memory Fallback (Database Offline)"
      });
    }
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// LOGIN ENDPOINT
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const lowerEmail = email.toLowerCase().trim();
    const isDbConnected = mongoose.connection.readyState === 1;

    let userObj = null;

    if (isDbConnected) {
      userObj = await User.findOne({ email: lowerEmail });
    } else {
      userObj = localUsers.find(u => u.email === lowerEmail);
    }

    if (!userObj) {
      return res.status(400).json({ error: "Account not found" });
    }

    const isMatch = await bcrypt.compare(password, userObj.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    const token = jwt.sign(
      { userId: (userObj._id || userObj.id).toString(), email: userObj.email, name: userObj.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: userObj._id || userObj.id,
        name: userObj.name,
        email: userObj.email,
        age: userObj.age,
        gender: userObj.gender,
        height: userObj.height,
        weight: userObj.weight,
        sport: userObj.sport
      },
      storageType: isDbConnected ? "MongoDB Cloud" : "Local In-Memory Fallback (Database Offline)"
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// GET USER PROFILE
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    const userId = req.user?.userId;

    let userObj = null;

    if (isDbConnected) {
      userObj = await User.findById(userId);
    } else {
      userObj = localUsers.find(u => u._id === userId);
    }

    if (!userObj) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      user: {
        id: userObj._id || userObj.id,
        name: userObj.name,
        email: userObj.email,
        age: userObj.age,
        gender: userObj.gender,
        height: userObj.height,
        weight: userObj.weight,
        sport: userObj.sport
      },
      dbStatus: isDbConnected ? "connected" : "fallback"
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// FORGOT & RESET PASSWORD ENDPOINTS
router.post("/request-reset", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email address is required" });
    }

    const lowerEmail = email.toLowerCase().trim();
    const isDbConnected = mongoose.connection.readyState === 1;

    let userExists = false;
    if (isDbConnected) {
      const dbUser = await User.findOne({ email: lowerEmail });
      if (dbUser) userExists = true;
    } else {
      const offlineUser = localUsers.find(u => u.email === lowerEmail);
      if (offlineUser) userExists = true;
    }

    if (!userExists) {
      return res.status(404).json({ error: "No profile was found with this email." });
    }

    // Generate 6-digit OTP code for password recovery
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    pendingOtps[lowerEmail] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 mins
      action: "reset"
    };

    console.log(`\n🔑 [OTP PASSWORD RECOVERY SYSTEM] Reset code ${otp} for email ${lowerEmail}`);

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || '"Twin2Win Account Recovery" <no-reply@twin2win.net>';

    const transporter = createMailTransporter();

    await transporter.sendMail({
      from,
      to: lowerEmail,
      subject: `🔑 Reset Twin2Win Password - Code: ${otp}`,
      text: `Hello athlete!\n\nUse the following confidential 6-digit verification code to reset your account password:\n\n➡️ Code: ${otp}\n\nNote: This code expires in 5 minutes.\n\nTwin2Win Security Division`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <div style="background-color: #f43f5e; padding: 25px; text-align: center; color: #ffffff;">
            <span style="font-size: 24px; font-weight: 900; letter-spacing: 1.5px;">🔑 PASSWORD RECOVERY</span>
          </div>
          <div style="padding: 25px; text-align: center; background-color: #ffffff;">
            <h2 style="color: #0f172a; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #475569; font-size: 14.5px; line-height: 1.6;">Use the verification code below to authorize a password change for your Twin2Win player profile:</p>
            
            <div style="background-color: #fff1f2; border: 1px dashed #f43f5e; border-radius: 12px; padding: 16px; margin: 24px 0; display: inline-block; min-width: 220px;">
              <span style="font-size: 34px; font-weight: 900; letter-spacing: 6px; color: #e11d48; font-family: monospace;">${otp}</span>
            </div>
            
            <p style="color: #64748b; font-size: 11.5px; margin-bottom: 0;">This code is active for <strong>5 minutes</strong>. If you did not initialize this recovery, you can ignore this email safely.</p>
          </div>
        </div>
      `
    });

    return res.json({ success: true, message: "A 6-digit password reset code was dispatched to your email address." });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(500).json({ error: error.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, reset verification code, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }

    const lowerEmail = email.toLowerCase().trim();
    const pending = pendingOtps[lowerEmail];

    if (!pending || pending.otp !== otp || pending.expiresAt < Date.now() || pending.action !== "reset") {
      return res.status(400).json({ error: "Invalid, incorrect, or expired password reset verification code." });
    }

    // Clear utilized code
    delete pendingOtps[lowerEmail];

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const dbUser = await User.findOneAndUpdate(
        { email: lowerEmail },
        { password: hashedPassword },
        { new: true }
      );
      if (!dbUser) {
        return res.status(404).json({ error: "User failed to update; profile not found." });
      }
    } else {
      const idx = localUsers.findIndex(u => u.email === lowerEmail);
      if (idx === -1) {
        return res.status(404).json({ error: "Local athlete profile was not found." });
      }
      localUsers[idx].password = hashedPassword;
    }

    return res.json({ success: true, message: "Password updated successfully! You can now log back in." });
  } catch (error) {
    console.error("Complete password reset error:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;

