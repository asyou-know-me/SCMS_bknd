import { Router } from "express";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
import {
  applyLeave,
  decideStudentApproval,
  listPendingStudents,
  myLeaves,
  studentAttendanceSummary,
  todayFacultyLeaves,
} from "../controllers/faculty.controller.js";
import { createAnnouncement, listAnnouncementsForUser } from "../controllers/announcement.controller.js";

const router = Router();

router.get("/announcements", protect, allowRoles("FACULTY", "STUDENT", "ADMIN"), listAnnouncementsForUser);
router.get("/today-leaves", protect, allowRoles("FACULTY", "STUDENT", "ADMIN"), todayFacultyLeaves);

router.get("/students/pending", protect, allowRoles("FACULTY"), listPendingStudents);
router.post("/students/:studentId/approval", protect, allowRoles("FACULTY"), decideStudentApproval);
router.post("/leave", protect, allowRoles("FACULTY"), applyLeave);
router.get("/leave", protect, allowRoles("FACULTY"), myLeaves);
router.get("/attendance/students", protect, allowRoles("FACULTY"), studentAttendanceSummary);
router.post("/announcements", protect, allowRoles("ADMIN"), createAnnouncement);

export default router;
