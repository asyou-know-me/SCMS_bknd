import { Router } from "express";
import {
  createSession,
  markAttendance,
  getSessionReport,
  closeSession,
  myAttendanceSummary,
} from "../controllers/attendance.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
const router = Router();

router.post("/session", protect, allowRoles("FACULTY"), createSession);
router.get("/session/:sessionId/report", protect, allowRoles("FACULTY"), getSessionReport);
router.post("/session/:sessionId/close", protect, allowRoles("FACULTY"), closeSession);
router.post("/mark", protect, allowRoles("STUDENT"), markAttendance);
router.get("/student/me", protect, allowRoles("STUDENT"), myAttendanceSummary);

export default router;
