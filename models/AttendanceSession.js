import mongoose from "mongoose";

const attendanceSessionSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dept: { type: String, required: true },
    year: { type: String, required: true },
    section: { type: String, required: true },

    subject: { type: String, required: true },
    sessionCode: { type: String, required: true, unique: true },

    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("AttendanceSession", attendanceSessionSchema)