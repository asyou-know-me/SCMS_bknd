import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";

export const createAssignment = async (req, res) => {
  try {
    const { title, description, subject, dept, year, section, dueDate } = req.body;
    if (!title || !subject || !dept || !year || !section || !dueDate) {
      return res.status(400).json({
        message: "title, subject, dept, year, section, dueDate required",
      });
    }

    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : "";

    const assignment = await Assignment.create({
      createdBy: req.user._id,
      title,
      description,
      subject,
      dept,
      year,
      section,
      dueDate: new Date(dueDate),
      attachmentUrl,
    });

    const populatedAssignment = await Assignment.findById(assignment._id).populate(
      "createdBy",
      "name email role"
    );

    res.status(201).json({ message: "Assignment created", assignment: populatedAssignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listAssignmentForStudent = async (req, res) => {
  try {
    const assignments = await Assignment.find({
      dept: req.user.dept,
      year: req.user.year,
      section: req.user.section,
    })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    const submissions = await Submission.find({ studentId: req.user._id }).select(
      "assignmentId submittedAt status fileUrl comment facultyRemark"
    );

    const submissionMap = submissions.reduce((acc, item) => {
      acc[String(item.assignmentId)] = item;
      return acc;
    }, {});

    const merged = assignments.map((assignment) => ({
      ...assignment.toObject(),
      mySubmission: submissionMap[String(assignment._id)] || null,
    }));

    res.json({ count: merged.length, assignments: merged });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listAssignmentsForFaculty = async (req, res) => {
  try {
    const assignments = await Assignment.find({ createdBy: req.user._id }).sort({ createdAt: -1 });

    const assignmentIds = assignments.map((item) => item._id);
    const groupedSubmissions = await Submission.aggregate([
      { $match: { assignmentId: { $in: assignmentIds } } },
      {
        $group: {
          _id: "$assignmentId",
          totalSubmissions: { $sum: 1 },
          lateSubmissions: {
            $sum: {
              $cond: [{ $in: ["$status", ["LATE", "RESUBMITTED_LATE"]] }, 1, 0],
            },
          },
          rejectedSubmissions: {
            $sum: {
              $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const countMap = groupedSubmissions.reduce((acc, item) => {
      acc[String(item._id)] = item;
      return acc;
    }, {});

    const merged = assignments.map((assignment) => ({
      ...assignment.toObject(),
      submissionStats: countMap[String(assignment._id)] || {
        totalSubmissions: 0,
        lateSubmissions: 0,
        rejectedSubmissions: 0,
      },
    }));

    res.json({ count: merged.length, assignments: merged });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment = "" } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (
      assignment.dept !== req.user.dept ||
      assignment.year !== req.user.year ||
      assignment.section !== req.user.section
    ) {
      return res.status(403).json({ message: "Not allowed for this assignment" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Submission file required" });
    }

    const now = new Date();
    const existing = await Submission.findOne({ assignmentId: assignment._id, studentId: req.user._id });
    const late = now > new Date(assignment.dueDate);
    const status = existing ? (late ? "RESUBMITTED_LATE" : "RESUBMITTED") : late ? "LATE" : "SUBMITTED";

    const payload = {
      fileUrl: `/uploads/${req.file.filename}`,
      comment,
      submittedAt: now,
      status,
      facultyRemark: existing?.status === "REJECTED" ? existing.facultyRemark || "" : "",
    };

    const submission = existing
      ? await Submission.findOneAndUpdate(
          { assignmentId: assignment._id, studentId: req.user._id },
          payload,
          { new: true }
        )
      : await Submission.create({
          assignmentId: assignment._id,
          studentId: req.user._id,
          ...payload,
        });

    res.status(existing ? 200 : 201).json({
      message: existing ? "Assignment resubmitted" : "Submitted",
      submission,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Already submitted" });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getSubmissionForAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id).populate("createdBy", "name email");
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (String(assignment.createdBy._id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const submissions = await Submission.find({ assignmentId: id })
      .populate("studentId", "name email rollNo dept year section")
      .sort({ createdAt: 1 });

    res.json({ assignment, count: submissions.length, submissions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reviewSubmission = async (req, res) => {
  try {
    const { id, submissionId } = req.params;
    const { status, facultyRemark = "" } = req.body;
    if (!["REJECTED", "SUBMITTED"].includes(status)) {
      return res.status(400).json({ message: "status must be REJECTED or SUBMITTED" });
    }

    const assignment = await Assignment.findById(id).populate("createdBy", "_id");
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (String(assignment.createdBy._id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const submission = await Submission.findOne({ _id: submissionId, assignmentId: id });
    if (!submission) return res.status(404).json({ message: "Submission not found" });

    submission.status = status;
    submission.facultyRemark = facultyRemark;
    await submission.save();

    res.json({ message: "Submission reviewed", submission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
