import AttendanceRecord from "../models/AttendanceRecord.js";
import AttendanceSession from "../models/AttendanceSession.js";
import FacultyLeave from "../models/FacultyLeave.js";
import User from "../models/User.js";

const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

export const listPendingStudents = async (req, res) => {
  try {
    const query = {
      role: "STUDENT",
      campusCode: req.user.campusCode,
      approvalStatus: "PENDING",
    };
    if (req.user.dept) query.dept = req.user.dept;

    const students = await User.find(query)
      .select("name email rollNo dept year section approvalStatus createdAt")
      .sort({ createdAt: -1 });

    res.json({ count: students.length, students });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const decideStudentApproval = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, reason = "" } = req.body;
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "status must be APPROVED or REJECTED" });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== "STUDENT" || student.campusCode !== req.user.campusCode) {
      return res.status(404).json({ message: "Student not found" });
    }
    if (req.user.dept && student.dept && req.user.dept !== student.dept) {
      return res.status(403).json({ message: "You can approve only students in your department" });
    }

    student.approvalStatus = status;
    student.rejectionReason = status === "REJECTED" ? reason : "";
    student.approvedBy = req.user._id;
    await student.save();

    res.json({ message: `Student ${status.toLowerCase()}`, student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const applyLeave = async (req, res) => {
  try {
    const { leaveDate, reason = "" } = req.body;
    if (!leaveDate) {
      return res.status(400).json({ message: "leaveDate is required" });
    }

    const leave = await FacultyLeave.create({
      campusCode: req.user.campusCode,
      facultyId: req.user._id,
      leaveDate: new Date(leaveDate),
      reason,
    });

    res.status(201).json({ message: "Leave request submitted", leave });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Leave request already exists for this date" });
    }
    res.status(500).json({ message: error.message });
  }
};

export const myLeaves = async (req, res) => {
  try {
    const leaves = await FacultyLeave.find({ facultyId: req.user._id }).sort({ leaveDate: -1, createdAt: -1 });
    res.json({ count: leaves.length, leaves });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const todayFacultyLeaves = async (req, res) => {
  try {
    const { start, end } = todayRange();
    const leaves = await FacultyLeave.find({
      campusCode: req.user.campusCode,
      status: "APPROVED",
      leaveDate: { $gte: start, $lt: end },
    })
      .populate("facultyId", "name email dept")
      .sort({ createdAt: -1 });

    res.json({ count: leaves.length, leaves });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const studentAttendanceSummary = async (req, res) => {
  try {
    const query = { role: "STUDENT", campusCode: req.user.campusCode };
    if (req.user.dept) query.dept = req.user.dept;
    if (req.user.year) query.year = req.user.year;
    if (req.user.section) query.section = req.user.section;
    const students = await User.find(query).select("name rollNo dept year section");

    const sessions = await AttendanceSession.find({ createdBy: req.user._id }).select("_id subject");
    const sessionIds = sessions.map((s) => s._id);
    const attendance = await AttendanceRecord.aggregate([
      { $match: { sessionId: { $in: sessionIds } } },
      { $group: { _id: "$studentId", presentCount: { $sum: 1 } } },
    ]);
    const map = Object.fromEntries(attendance.map((a) => [String(a._id), a.presentCount]));
    res.json({
      count: students.length,
      students: students.map((s) => ({ ...s.toObject(), presentCount: map[String(s._id)] || 0 })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
