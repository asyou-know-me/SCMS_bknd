import { Router } from "express";
import { protect, allowRoles } from "../middlewares/auth.middleware.js";
import { listAnnouncementsForUser } from "../controllers/announcement.controller.js";

const router = Router();

router.get("/", protect, allowRoles("ADMIN", "FACULTY", "STUDENT"), listAnnouncementsForUser);

export default router;
