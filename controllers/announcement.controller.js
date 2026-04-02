import Announcement from "../models/Announcement.js";

export const createAnnouncement = async (req, res) => {
  try {
    const { title, message, audience = "ALL" } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: "title and message are required" });
    }

    const announcement = await Announcement.create({
      campusCode: req.user.campusCode,
      createdBy: req.user._id,
      title,
      message,
      audience,
    });

    res.status(201).json({ message: "Announcement posted", announcement });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listAnnouncementsForUser = async (req, res) => {
  try {
    const audiences = ["ALL"];
    if (req.user.role === "FACULTY") audiences.push("FACULTY");
    if (req.user.role === "STUDENT") audiences.push("STUDENT");

    const announcements = await Announcement.find({
      campusCode: req.user.campusCode,
      audience: { $in: audiences },
    })
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 });

    res.json({ count: announcements.length, announcements });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ campusCode: req.user.campusCode })
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 });
    res.json({ count: announcements.length, announcements });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
