const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    // We force this to be a String and Required.
    organizerId: { type: String, required: true }, 
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    price: { type: Number, required: true },
    capacity: { type: Number, required: true },
    sold: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", EventSchema);