import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["ADMIN", "FACULTY", "STUDENT"],
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    rollNo: { type: String, unique: true, sparse: true },
    dept: { type: String, default: "" },
    year: { type: String, default: "" },
    section: { type: String, default: "" },
    campusCode: { type: String, index: true },
    adminCode: { type: String, unique: true, sparse: true },
    approvalStatus: {
      type: String,
      enum: ["APPROVED", "PENDING", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: { type: String, default: "" },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
