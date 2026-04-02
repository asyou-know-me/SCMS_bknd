import mongoose from "mongoose";

const facultyAttendanceSessionSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    subject: { type: String, required: true },
    sessionCode: { type: String, required: true, unique: true },

    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("FacultyAttendanceSession", facultyAttendanceSessionSchema)