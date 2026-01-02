const router = require("express").Router();
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const User = require("../models/User"); 
const { verifyToken } = require("../middleware/verifyToken");

// --- DEBUG VERSION OF GET ROUTE ---
router.get("/", verifyToken, async (req, res) => {
  try {
    console.log("---------------- DEBUGGING MY TICKETS ----------------");
    console.log("1. WHO IS ASKING? (From Token):", req.user.id);
    console.log("   (Raw User Object):", req.user);

    const tickets = await Ticket.find({ userId: req.user.id });
    console.log(`2. SEARCH RESULT: Found ${tickets.length} tickets using userId: "${req.user.id}"`);

    if (tickets.length === 0) {
        const allTickets = await Ticket.find();
        console.log("3. TOTAL TICKETS IN DB:", allTickets.length);
        if (allTickets.length > 0) {
            console.log("   Sample Ticket userId:", allTickets[0].userId);
            console.log("   Does it match token?", allTickets[0].userId === req.user.id);
        }
    }

    const list = await Promise.all(
      tickets.map(async (ticket) => {
        const event = await Event.findById(ticket.eventId);
        return {
          ...ticket._doc,
          eventTitle: event ? event.title : "Unknown Event",
          eventDate: event ? event.date : null,
          eventLocation: event ? event.location : "Unknown",
        };
      })
    );

    res.status(200).json(list);
    console.log("------------------------------------------------------");
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json(err);
  }
});

// BUY TICKETS (With Pre-Check + RabbitMQ)
router.post("/purchase", verifyToken, async (req, res) => {
    const amqp = require("amqplib");
    const { eventId, quantity } = req.body;

    try {
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json("Event not found!");

        if (event.sold + quantity > event.capacity) {
            return res.status(400).json(`Sold Out! Only ${event.capacity - event.sold} tickets left.`);
        }

        const qrCodeString = `${eventId}-${req.user.id}-${Date.now()}`;
        const orderData = { 
            eventId, 
            quantity, 
            userId: req.user.id, 
            qrCode: qrCodeString 
        };
        
        const connection = await amqp.connect(process.env.RABBIT_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue("ticket_orders", { durable: true });
        
        channel.sendToQueue(
            "ticket_orders", 
            Buffer.from(JSON.stringify(orderData)), 
            { persistent: true }
        );
        
        res.status(200).json({ 
            message: "Purchase processing started!", 
            qrCode: qrCodeString,
            eventTitle: event.title,
            eventDate: event.date,
            quantity: quantity
        });

    } catch(err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// VERIFY TICKET (Updated with Check-In Logic)
router.post("/verify", verifyToken, async (req, res) => {
  try {
    const { qrCode } = req.body;
    
    console.log("---------------- VERIFY CHECK ----------------");
    console.log("1. Received Code:", qrCode);

    const ticket = await Ticket.findOne({ qrCode: qrCode });
    console.log("2. Database Search Result:", ticket ? "FOUND" : "NOT FOUND");

    if (!ticket) {
      return res.status(404).json("INVALID TICKET");
    }

    // 🔴 THE KEY ADDITION: Check if already used
    if (ticket.isCheckedIn) {
      console.log("⚠️ Access Denied: Ticket already scanned.");
      return res.status(400).json("ALREADY SCANNED");
    }

    // 🟢 MARK AS USED: Save the check-in status
    ticket.isCheckedIn = true;
    await ticket.save();

    const event = await Event.findById(ticket.eventId);
    const user = await User.findById(ticket.userId);

    res.status(200).json({
      valid: true,
      owner: user ? user.username : "Unknown User",
      event: event ? event.title : "Unknown Event",
      date: event ? new Date(event.date).toLocaleDateString() : "N/A",
      quantity: ticket.quantity,
      purchaseDate: new Date(ticket.createdAt).toLocaleString()
    });
    console.log("3. Success! Ticket marked as checked-in.");
    console.log("----------------------------------------------");

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json(err);
  }
});

module.exports = router;