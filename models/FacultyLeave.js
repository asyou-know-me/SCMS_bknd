import mongoose from "mongoose";

const facultyLeaveSchema = new mongoose.Schema(
  {
    campusCode: { type: String, required: true, index: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reason: { type: String, default: "" },
    leaveDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    decisionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decisionNote: { type: String, default: "" },
  },
  { timestamps: true }
);

facultyLeaveSchema.index({ facultyId: 1, leaveDate: 1 }, { unique: true });

export default mongoose.model("FacultyLeave", facultyLeaveSchema);
