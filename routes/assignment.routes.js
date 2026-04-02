import { Router } from "express";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../modules/upload.js";

import {
  createAssignment,
  listAssignmentForStudent,
  listAssignmentsForFaculty,
  submitAssignment,
  getSubmissionForAssignment,
  reviewSubmission,
} from "../controllers/assignment.controller.js";

const router = Router();

router.post("/", protect, allowRoles("FACULTY"), upload.single("attachment"), createAssignment);
router.get("/faculty/mine", protect, allowRoles("FACULTY"), listAssignmentsForFaculty);
router.get("/:id/submissions", protect, allowRoles("FACULTY"), getSubmissionForAssignment);
router.post("/:id/submissions/:submissionId/review", protect, allowRoles("FACULTY"), reviewSubmission);

router.get("/", protect, allowRoles("STUDENT"), listAssignmentForStudent);
router.post("/:id/submit", protect, allowRoles("STUDENT"), upload.single("file"), submitAssignment);

export default router;
