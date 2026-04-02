import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fileUrl: { type: String, required: true },
    comment: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now },
    facultyRemark: { type: String, default: "" },

    status: {
      type: String,
      enum: ["SUBMITTED", "LATE", "REJECTED", "RESUBMITTED", "RESUBMITTED_LATE"],
      default: "SUBMITTED",
    },
  },
  { timestamps: true },
);

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

export default mongoose.model("Submission", submissionSchema);
