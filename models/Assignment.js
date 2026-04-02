import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // FACULTY

    title: { type: String, required: true },
    description: { type: String, default: "" },
    subject: { type: String, required: true },

    dept: { type: String, required: true },
    year: { type: String, required: true },
    section: { type: String, required: true },

    dueDate: { type: Date, required: true },
    attachmentUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("Assignment", assignmentSchema);
