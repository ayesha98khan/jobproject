const router = require("express").Router();
const Job = require("../models/Job");
const auth = require("../middleware/auth");

// ✅ Public: list jobs with pagination
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      Job.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Job.countDocuments(),
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      jobs,
    });
  } catch (err) {
    next(err);
  }
});
// ✅ Protected: list jobs created by the logged-in recruiter
router.get("/mine", auth, async (req, res, next) => {
  try {
    if (req.user?.role !== "recruiter") {
      return res.status(403).json({ message: "Only recruiters can view this" });
    }

    const jobs = await Job.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);

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
