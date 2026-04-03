import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import attendanceRoutes from "./routes/atttendance.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import facultyAttendanceRoutes from "./routes/faculty.attendance.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import facultyRoutes from "./routes/faculty.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

const rawClientUrls = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URLS,
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URLS,
]
  .filter(Boolean)
  .flatMap((value) => String(value).split(","))
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://smart-campus-management-system-seven.vercel.app",
  ...rawClientUrls,
]);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  if (allowedOrigins.has(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === "https:" && hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Smart Campus API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/faculty-attendance", facultyAttendanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/announcements", announcementRoutes);

app.use((err, req, res, next) => {
  if (err?.message === "File type not allowed") {
    return res.status(400).json({ message: err.message });
  }
  if (err?.message?.startsWith("CORS blocked for origin:")) {
    return res.status(403).json({ message: err.message });
  }
  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
});

const start = async () => {
  await connectDB();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on port ${PORT}`);
    console.log("Allowed CORS origins:", [...allowedOrigins]);
  });
};

start();
