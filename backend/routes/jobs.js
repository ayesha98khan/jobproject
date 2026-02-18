const router = require("express").Router();
const Job = require("../models/Job");
const { auth } = require("../middleware/auth");

// Public: list jobs
router.get("/", async (req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 }).limit(100);
  res.json(jobs);
});

// Protected: create job
router.post("/", auth, async (req, res) => {
  const { title, company, location, description } = req.body || {};
  if (!title || !company) return res.status(400).json({ message: "title and company required" });

  const job = await Job.create({
    title,
    company,
    location,
    description,
    createdBy: req.user.id
  });

  res.status(201).json(job);
});

module.exports = router;
