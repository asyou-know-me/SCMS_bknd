import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    campusCode: { type: String, required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    audience: {
      type: String,
      enum: ["ALL", "FACULTY", "STUDENT"],
      default: "ALL",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Announcement", announcementSchema);
