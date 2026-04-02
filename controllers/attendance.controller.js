import crypto from "crypto";
import AttendanceRecord from "../models/AttendanceRecord.js";
import AttendanceSession from "../models/AttendanceSession.js";

export const createSession = async (req, res) => {
  try {
    const { dept, year, section, subject, durationMinuts = 5 } = req.body;

    if (!dept || !year || !section || !subject) {
      return res.status(400).json({ message: "dept, year, section, subject required" });
    }

    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + Number(durationMinuts) * 60 * 1000);
    const sessionCode = crypto.randomBytes(8).toString("hex");

    const session = await AttendanceSession.create({
      createdBy: req.user._id,
      dept,
      year,
      section,
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
        dept,
        year,
        section,
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

    const session = await AttendanceSession.findOne({ sessionCode });
    if (!session) {
      return res.status(404).json({ message: "Invalid QR / Session not found" });
    }

    const now = new Date();
    if (!session.isActive || now > session.expiresAt) {
      return res.status(400).json({ message: "Session expired/inactive" });
    }

    if (
      req.user.role !== "STUDENT" ||
      req.user.dept !== session.dept ||
      req.user.year !== session.year ||
      req.user.section !== session.section
    ) {
      return res.status(403).json({ message: "You are not allowed for this session" });
    }

    const record = await AttendanceRecord.create({
      sessionId: session._id,
      studentId: req.user._id,
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

    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (String(session.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const records = await AttendanceRecord.find({ sessionId })
      .populate("studentId", "name email rollNo dept year section")
      .sort({ createdAt: 1 });

    res.json({ session, count: records.length, records });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const closeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await AttendanceSession.findById(sessionId);
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

export const myAttendanceSummary = async (req, res) => {
  try {
    const records = await AttendanceRecord.find({ studentId: req.user._id }).populate({
      path: "sessionId",
      select: "subject dept year section startsAt",
    });

    const summary = records.reduce((acc, record) => {
      const subject = record.sessionId?.subject || "Unknown";
      acc[subject] = (acc[subject] || 0) + 1;
      return acc;
    }, {});

    res.json({
      count: records.length,
      bySubject: Object.entries(summary).map(([subject, presentCount]) => ({ subject, presentCount })),
      records,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
