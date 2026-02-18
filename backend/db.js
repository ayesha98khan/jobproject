const mongoose = require("mongoose");

async function connectDB(uri, dbName) {
  await mongoose.connect(uri, { dbName });
  console.log("✅ MongoDB connected");
}

module.exports = { connectDB };
