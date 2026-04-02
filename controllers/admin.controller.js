import Announcement from "../models/Announcement.js";
import Assignment from "../models/Assignment.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import AttendanceSession from "../models/AttendanceSession.js";
import FacultyAttendanceRecord from "../models/FacultyAttendanceRecord.js";
import FacultyAttendanceSession from "../models/FacultyAttendanceSession.js";
import FacultyLeave from "../models/FacultyLeave.js";
import Submission from "../models/Submission.js";
import User from "../models/User.js";

const campusFilter = (req) => ({ campusCode: req.user.campusCode });
const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

export const getDashboard = async (req, res) => {
  try {
    const campusCode = req.user.campusCode;
    const [
      totalStudents,
      totalFaculty,
      pendingFaculty,
      pendingStudents,
      totalAnnouncements,
      totalAssignments,
      facultyOnLeave,
      approvedFaculty,
    ] = await Promise.all([
      User.countDocuments({ role: "STUDENT", campusCode }),
      User.countDocuments({ role: "FACULTY", campusCode }),
      User.countDocuments({ role: "FACULTY", campusCode, approvalStatus: "PENDING" }),
      User.countDocuments({ role: "STUDENT", campusCode, approvalStatus: "PENDING" }),
      Announcement.countDocuments({ campusCode }),
      Assignment.countDocuments(),
      FacultyLeave.countDocuments({ campusCode, status: "APPROVED", leaveDate: { $gte: todayRange().start, $lt: todayRange().end } }),
      User.countDocuments({ role: "FACULTY", campusCode, approvalStatus: "APPROVED" }),
    ]);

    res.json({
      campusCode,
      totalStudents,
      totalFaculty,
      approvedFaculty,
      pendingFaculty,
      pendingStudents,
      totalAnnouncements,
      totalAssignments,
      facultyOnLeave,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listUsers = async (req, res) => {
  try {
    const { role, status } = req.query;
    const query = { ...campusFilter(req) };
    if (role) query.role = role;
    if (status) query.approvalStatus = status;

    const users = await User.find(query)
      .select("name email role rollNo dept year section campusCode approvalStatus rejectionReason createdAt")
      .sort({ createdAt: -1 });

    res.json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const decideUserApproval = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason = "" } = req.body;
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "status must be APPROVED or REJECTED" });
    }

    const user = await User.findById(userId);
    if (!user || user.campusCode !== req.user.campusCode) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "ADMIN") {
      return res.status(400).json({ message: "Admin approval cannot be changed" });
    }

    user.approvalStatus = status;
    user.rejectionReason = status === "REJECTED" ? reason : "";
    user.approvedBy = req.user._id;
    await user.save();

    res.json({ message: `User ${status.toLowerCase()}`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listLeaveRequests = async (req, res) => {
  try {
    const leaves = await FacultyLeave.find(campusFilter(req))
      .populate("facultyId", "name email dept")
      .populate("decisionBy", "name role")
      .sort({ leaveDate: -1, createdAt: -1 });
    res.json({ count: leaves.length, leaves });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const decideLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, decisionNote = "" } = req.body;
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid leave status" });
    }
    const leave = await FacultyLeave.findById(leaveId).populate("facultyId", "campusCode");
    if (!leave || leave.campusCode !== req.user.campusCode) {
      return res.status(404).json({ message: "Leave request not found" });
    }
    leave.status = status;
    leave.decisionNote = decisionNote;
    leave.decisionBy = req.user._id;
    await leave.save();
    res.json({ message: `Leave ${status.toLowerCase()}`, leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const facultyAttendanceSummary = async (req, res) => {
  try {
    const campusCode = req.user.campusCode;
    const faculty = await User.find({ role: "FACULTY", campusCode, approvalStatus: "APPROVED" }).select(
      "name email dept"
    );

    const sessions = await FacultyAttendanceSession.find({ createdBy: req.user._id }).select("_id subject createdAt");
    const sessionIds = sessions.map((s) => s._id);
    const attendance = await FacultyAttendanceRecord.aggregate([
      { $match: { sessionId: { $in: sessionIds } } },
      { $group: { _id: "$facultyId", presentCount: { $sum: 1 } } },
    ]);
    const map = Object.fromEntries(attendance.map((a) => [String(a._id), a.presentCount]));

    res.json({
      count: faculty.length,
      faculty: faculty.map((f) => ({
        ...f.toObject(),
        presentCount: map[String(f._id)] || 0,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const studentAttendanceSummary = async (req, res) => {
  try {
    const students = await User.find({ role: "STUDENT", campusCode: req.user.campusCode }).select(
      "name email rollNo dept year section"
    );
    const sessions = await AttendanceSession.find().select("_id");
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

export const adminCreateFacultySession = async (req, res) => {
  try {
    req.user.role = "ADMIN";
    return res.status(500).json({ message: "Use /api/faculty-attendance/session instead" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminOverview = async (req, res) => {
  try {
    const today = todayRange();
    const [announcements, leaves, pendingFaculty, pendingStudents, recentAssignments, submissions] = await Promise.all([
      Announcement.find({ campusCode: req.user.campusCode }).sort({ createdAt: -1 }).limit(5),
      FacultyLeave.find({ campusCode: req.user.campusCode, leaveDate: { $gte: today.start, $lt: today.end } })
        .populate("facultyId", "name dept")
        .sort({ createdAt: -1 }),
      User.find({ role: "FACULTY", campusCode: req.user.campusCode, approvalStatus: "PENDING" }).select("name email dept createdAt"),
      User.find({ role: "STUDENT", campusCode: req.user.campusCode, approvalStatus: "PENDING" }).select("name email rollNo dept year section createdAt"),
      Assignment.find().populate("createdBy", "name").sort({ createdAt: -1 }).limit(10),
      Submission.find().populate("studentId", "name rollNo").sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({ announcements, leaves, pendingFaculty, pendingStudents, recentAssignments, submissions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
