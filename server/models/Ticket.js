const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    userId: { type: String, required: true }, // The attendee
    
    // Added Quantity as requested
    quantity: { type: Number, required: true, default: 1 },

    // Unique string for the QR (We generate this in the backend)
    qrCode: { type: String, required: true }, 
    
    isCheckedIn: { type: Boolean, default: false },
    purchaseDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", TicketSchema);