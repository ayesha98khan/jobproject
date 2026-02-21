const router = require("express").Router();
const Job = require("../models/Job");
const auth = require("../middleware/auth");

// ✅ Public: list jobs (latest first)
router.get("/", async (req, res, next) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).limit(100);
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

// ✅ Protected: create job (ONLY recruiters)
router.post("/", auth, async (req, res, next) => {
  try {
    // Only recruiters can post
    if (req.user?.role !== "recruiter") {
      return res
        .status(403)
        .json({ message: "Only recruiters can post jobs" });
    }

    const { title, company, location, description } = req.body || {};

    if (!title || !company) {
      return res
        .status(400)
        .json({ message: "title and company required" });
    }

    const job = await Job.create({
      title: String(title).trim(),
      company: String(company).trim(),
      location: location ? String(location).trim() : "",
      description: description ? String(description).trim() : "",
      createdBy: req.user.id, // from auth middleware
    });

    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
