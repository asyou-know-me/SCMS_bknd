import { Router } from "express";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
import {
  decideLeaveRequest,
  decideUserApproval,
  facultyAttendanceSummary,
  getAdminOverview,
  getDashboard,
  listLeaveRequests,
  listUsers,
  studentAttendanceSummary,
} from "../controllers/admin.controller.js";
import { createAnnouncement, listAllAnnouncements } from "../controllers/announcement.controller.js";

const router = Router();

router.use(protect, allowRoles("ADMIN"));

router.get("/dashboard", getDashboard);
router.get("/overview", getAdminOverview);
router.get("/users", listUsers);
router.post("/users/:userId/approval", decideUserApproval);
router.get("/announcements", listAllAnnouncements);
router.post("/announcements", createAnnouncement);
router.get("/leave-requests", listLeaveRequests);
router.post("/leave-requests/:leaveId/decision", decideLeaveRequest);
router.get("/attendance/faculty-summary", facultyAttendanceSummary);
router.get("/attendance/student-summary", studentAttendanceSummary);

export default router;
