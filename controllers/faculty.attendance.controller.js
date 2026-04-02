import crypto from "crypto";
import FacultyAttendanceRecord from "../models/FacultyAttendanceRecord.js";
import FacultyAttendanceSession from "../models/FacultyAttendanceSession.js";

export const createSession = async (req, res) => {
  try {
    const { subject, durationMinuts = 5 } = req.body;

    if (!subject) {
      return res.status(400).json({ message: "subject required" });
    }

    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + Number(durationMinuts) * 60 * 1000);
    const sessionCode = crypto.randomBytes(8).toString("hex");

    const session = await FacultyAttendanceSession.create({
      createdBy: req.user._id,
      subject,
      sessionCode,
      startsAt,
      expiresAt,
      isActive: true,
    });

    res.status(201).json({
      message: "Session created",
      session: {
        id: session._id,
        subject,
        sessionCode,
        startsAt,
        expiresAt,
        isActive: session.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAttendance = async (req, res) => {
  try {
    const { sessionCode } = req.body;
    if (!sessionCode) {
      return res.status(400).json({ message: "sessionCode required" });
    }

    const session = await FacultyAttendanceSession.findOne({ sessionCode });
    if (!session) {
      return res.status(404).json({ message: "Invalid QR / Session not found" });
    }

    const now = new Date();
    if (!session.isActive || now > session.expiresAt) {
      return res.status(400).json({ message: "Session expired/inactive" });
    }

    const record = await FacultyAttendanceRecord.create({
      sessionId: session._id,
      facultyId: req.user._id,
      status: "PRESENT",
      markedAt: now,
    });

    res.status(201).json({ message: "Attendance marked", recordId: record._id });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Already marked for this session" });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getSessionReport = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await FacultyAttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (String(session.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const records = await FacultyAttendanceRecord.find({ sessionId })
      .populate("facultyId", "name email dept")
      .sort({ createdAt: 1 });

    res.json({ session, count: records.length, records });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const closeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await FacultyAttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (String(session.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    session.isActive = false;
    await session.save();

    res.json({ message: "Session closed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
