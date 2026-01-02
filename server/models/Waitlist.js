const mongoose = require("mongoose");

const WaitlistSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userEmail: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Waitlist", WaitlistSchema);