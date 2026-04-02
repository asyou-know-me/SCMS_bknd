import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceSession",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: { type: String, enum: ["PRESENT"], default: "PRESENT" },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

export default mongoose.model("AttendanceRecord", attendanceRecordSchema);
