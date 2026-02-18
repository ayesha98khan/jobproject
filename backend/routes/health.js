const router = require("express").Router();

router.get("/", (req, res) => {
  res.json({ status: "ok", service: "jobproject-backend" });
});

module.exports = router;
