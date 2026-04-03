import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const signToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

const setTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000,
  });
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  rollNo: user.rollNo,
  dept: user.dept,
  year: user.year,
  section: user.section,
  campusCode: user.campusCode,
  adminCode: user.adminCode,
  approvalStatus: user.approvalStatus,
  rejectionReason: user.rejectionReason,
});

const generateCampusCode = async () => {
  for (let i = 0; i < 5; i += 1) {
    const code = crypto.randomBytes(3).toString("hex").toUpperCase();
    const existing = await User.findOne({ adminCode: code, role: "ADMIN" });
    if (!existing) return code;
  }
  return `CMP${Date.now().toString().slice(-6)}`;
};

export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      rollNo,
      dept,
      year,
      section,
      campusCode: rawCampusCode,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ message: "name, email, password, role are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    if (role === "STUDENT" && !rollNo) {
      return res.status(400).json({ message: "rollNo required for student" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let campusCode = rawCampusCode ? String(rawCampusCode).trim().toUpperCase() : "";
    let adminCode = undefined;
    let approvalStatus = "PENDING";
    let approvedBy = null;
    let rejectionReason = "";

    if (role === "ADMIN") {
      adminCode = await generateCampusCode();
      campusCode = adminCode;
      approvalStatus = "APPROVED";
    } else {
      if (!campusCode) {
        return res.status(400).json({ message: "campusCode is required" });
      }
      const campusAdmin = await User.findOne({ role: "ADMIN", adminCode: campusCode });
      if (!campusAdmin) {
        return res.status(404).json({ message: "Invalid campus code" });
      }
      if (role === "FACULTY") {
        approvedBy = campusAdmin._id;
      }
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      role,
      dept,
      year,
      section,
      passwordHash,
      rollNo: role === "STUDENT" ? rollNo : undefined,
      campusCode,
      adminCode,
      approvalStatus,
      approvedBy,
      rejectionReason,
    });

    if (role === "STUDENT") {
      const approver = await User.findOne({
        role: "FACULTY",
        campusCode,
        approvalStatus: "APPROVED",
        ...(dept ? { dept } : {}),
      }).sort({ createdAt: 1 });
      if (approver) {
        user.approvedBy = approver._id;
        await user.save();
      }
    }

    const message =
      user.approvalStatus === "APPROVED"
        ? "Registered successfully"
        : `Registered successfully. Your ${role.toLowerCase()} account is pending approval.`;

    const token = user.approvalStatus === "APPROVED" ? signToken(user) : "";
    if (token) setTokenCookie(res, token);

    return res.status(201).json({
      message,
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, campusCode: rawCampusCode } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const campusCode = rawCampusCode ? String(rawCampusCode).trim().toUpperCase() : "";
    if (user.role !== "ADMIN" && user.campusCode !== campusCode) {
      return res.status(403).json({ message: "Invalid campus code for this account" });
    }
    if (user.role === "ADMIN" && campusCode && user.adminCode !== campusCode) {
      return res.status(403).json({ message: "Invalid campus code for admin account" });
    }

    if (user.approvalStatus !== "APPROVED") {
      return res.status(403).json({
        message:
          user.approvalStatus === "REJECTED"
            ? user.rejectionReason || "Account rejected. Contact admin."
            : `Your account is pending approval.`,
      });
    }

    const token = signToken(user);
    setTokenCookie(res, token);

    return res.json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const me = async (req, res) => {
  return res.json({ user: sanitizeUser(req.user) });
};

export const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res.json({ message: "Logged out" });
};
