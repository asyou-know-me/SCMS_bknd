import { Router } from "express";
import {
  createSession,
  markAttendance,
  getSessionReport,
  closeSession,
} from "../controllers/faculty.attendance.controller.js";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
const router = Router();

router.post("/session", protect, allowRoles("ADMIN"), createSession);
router.get(
  "/session/:sessionId/report",
  protect,
  allowRoles("ADMIN"),
  getSessionReport,
);
router.post(
  "/session/:sessionId/close",
  protect,
  allowRoles("ADMIN"),
  closeSession,
);

router.post("/mark", protect, allowRoles("FACULTY"), markAttendance);
export default router;
