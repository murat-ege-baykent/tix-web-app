const router = require("express").Router();
const Event = require("../models/Event");
const Ticket = require("../models/Ticket"); 
const User = require("../models/User");     
const { verifyToken, verifyTokenAndOrganizer } = require("../middleware/verifyToken");
const amqp = require("amqplib");
const Waitlist = require("../models/Waitlist");

// --- NEW: GET EVENT ANALYTICS ---
router.get("/:id/analytics", verifyTokenAndOrganizer, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json("Event not found");

    // Calculate Sales Progress
    const salesPercentage = ((event.sold / event.capacity) * 100).toFixed(1);

    // Calculate Check-in Progress
    const totalTickets = await Ticket.find({ eventId: req.params.id });
    const checkedInCount = totalTickets.filter(t => t.isCheckedIn).length;
    const checkInPercentage = totalTickets.length > 0 
      ? ((checkedInCount / totalTickets.length) * 100).toFixed(1) 
      : 0;

    res.status(200).json({
      totalSold: event.sold,
      capacity: event.capacity,
      salesPercentage,
      checkedInCount,
      checkInPercentage,
      totalAttendees: totalTickets.length
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// GET EVENTS FOR ORGANIZER
router.get("/organizer", verifyTokenAndOrganizer, async (req, res) => {
  try {
    const events = await Event.find({ organizerId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(events);
  } catch (err) {
    console.error("Error fetching organizer events:", err);
    res.status(500).json(err);
  }
});

// CREATE EVENT
router.post("/", verifyTokenAndOrganizer, async (req, res) => {
  console.log("--- DEBUG: CREATE EVENT START ---");
  if (!req.user || !req.user.id) {
    return res.status(403).json("User ID missing from token. Please Re-Login.");
  }
  try {
    const newEvent = new Event({
      ...req.body,
      organizerId: req.user.id 
    });
    const savedEvent = await newEvent.save();
    res.status(200).json(savedEvent);
  } catch (err) {
    console.error("ERROR SAVING EVENT:", err);
    res.status(500).json(err);
  }
});

// GET ALL EVENTS (Public Search)
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 6, search, location, date } = req.query;
    const query = {};
    if (search) query.title = { $regex: search, $options: "i" };
    if (location) query.location = { $regex: location, $options: "i" };
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }
    const events = await Event.find(query)
      .collation({ locale: 'tr', strength: 2 })
      .limit(limit * 1) 
      .skip((page - 1) * limit) 
      .sort({ date: 1 });
    const count = await Event.countDocuments(query);
    res.status(200).json({
      events,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      totalEvents: count
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// GET EVENT BY ID
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    res.status(200).json(event);
  } catch (err) {
    res.status(500).json(err);
  }
});

// DELETE EVENT
router.delete("/:id", verifyTokenAndOrganizer, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.status(200).json("Event has been deleted...");
  } catch (err) {
    res.status(500).json(err);
  }
});

// UPDATE EVENT & NOTIFY OWNERS + WAITLIST
router.put("/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "organizer" && req.user.role !== "admin") {
      return res.status(403).json("Only organizers can edit events.");
    }

    const oldEvent = await Event.findById(req.params.id);
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!updatedEvent) return res.status(404).json("Event not found.");

    // --- 1. NOTIFY CURRENT TICKET HOLDERS ---
    const tickets = await Ticket.find({ eventId: req.params.id });
    const userIds = [...new Set(tickets.map((t) => t.userId))];
    const users = await User.find({ _id: { $in: userIds } });
    const emailList = users.map((u) => u.email).filter((email) => email);

    const connection = await amqp.connect(process.env.RABBIT_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue("event_updates", { durable: true });

    if (emailList.length > 0) {
      const notificationData = {
        eventTitle: updatedEvent.title,
        newDate: new Date(updatedEvent.date).toLocaleDateString(),
        newLocation: updatedEvent.location,
        emails: emailList,
        isWaitlistAlert: false
      };
      channel.sendToQueue("event_updates", Buffer.from(JSON.stringify(notificationData)), { persistent: true });
    }

    // --- 2. WAITLIST LOGIC: If capacity increased, notify waitlist ---
    if (updatedEvent.capacity > oldEvent.capacity) {
      const waitingUsers = await Waitlist.find({ eventId: req.params.id });
      const waitlistEmails = waitingUsers.map(u => u.userEmail);

      if (waitlistEmails.length > 0) {
        channel.sendToQueue("event_updates", Buffer.from(JSON.stringify({
          eventTitle: updatedEvent.title,
          newDate: new Date(updatedEvent.date).toLocaleDateString(),
          newLocation: updatedEvent.location,
          emails: waitlistEmails,
          isWaitlistAlert: true 
        })));
        
        await Waitlist.deleteMany({ eventId: req.params.id });
        console.log(`Waitlist notified for ${updatedEvent.title}`);
      }
    }

    res.status(200).json(updatedEvent);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

// JOIN WAITLIST
router.post("/:id/waitlist", verifyToken, async (req, res) => {
  try {
    const alreadyWaiting = await Waitlist.findOne({ eventId: req.params.id, userId: req.user.id });
    if (alreadyWaiting) return res.status(400).json("You are already on the waitlist.");

    const user = await User.findById(req.user.id);
    const newEntry = new Waitlist({
      eventId: req.params.id,
      userId: req.user.id,
      userEmail: user.email
    });

    await newEntry.save();
    res.status(200).json("Added to waitlist! We will email you if space opens up.");
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;