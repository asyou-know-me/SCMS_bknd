import mongoose from "mongoose";

const facultyAttendanceRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FacultyAttendanceSession",
      required: true,
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: { type: String, enum: ["PRESENT"], default: "PRESENT" },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

facultyAttendanceRecordSchema.index({ sessionId: 1, facultyId: 1 }, { unique: true });

export default mongoose.model("FacultyAttendanceRecord", facultyAttendanceRecordSchema);
