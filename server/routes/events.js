const router = require("express").Router();
const Event = require("../models/Event");
const { verifyToken } = require("../middleware/verifyToken"); // ✅ FIX: Added this import
const { verifyTokenAndOrganizer } = require("../middleware/verifyToken");

// CREATE EVENT (Only Organizers)
router.post("/", verifyTokenAndOrganizer, async (req, res) => {
  console.log("--- DEBUG: CREATE EVENT START ---");
  console.log("1. User from Token:", req.user); // Check if ID exists here
  console.log("2. Body from Frontend:", req.body);

  // validation check
  if (!req.user || !req.user.id) {
    console.log("ERROR: No user ID found in token.");
    return res.status(403).json("User ID missing from token. Please Re-Login.");
  }

  try {
    const newEvent = new Event({
      ...req.body,
      organizerId: req.user.id // This MUST match the token payload
    });

    console.log("3. Event to be saved:", newEvent);

    const savedEvent = await newEvent.save();
    console.log("4. SUCCESS: Event saved with ID:", savedEvent._id);
    
    res.status(200).json(savedEvent);
  } catch (err) {
    console.error("ERROR SAVING EVENT:", err);
    res.status(500).json(err);
  }
});

// GET ALL EVENTS (With Search, Filter, & Pagination)
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 6, search, location, date } = req.query;

    // 1. Build the Query Object
    const query = {};

    // Search by Name (Case-insensitive regex)
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    // Search by Location (Case-insensitive regex)
    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    // Search by Date (Matches the whole day, ignoring time)
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1); // Move to next day

      // Find events GREATER than start of day AND LESS than end of day
      query.date = { $gte: startDate, $lt: endDate };
    }

    // 2. execute Query with Pagination
    const events = await Event.find(query)
    .collation({ locale: 'tr', strength: 2 }) // <--- THIS IS THE FIX
    .limit(limit * 1) 
    .skip((page - 1) * limit) 
    .sort({ date: 1 });

    // 3. Get total count for pagination buttons
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

// DELETE EVENT (Organizer only)
router.delete("/:id", verifyTokenAndOrganizer, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.status(200).json("Event has been deleted...");
  } catch (err) {
    res.status(500).json(err);
  }
});

// --- UPDATE EVENT & NOTIFY OWNERS ---
router.put("/:id", verifyToken, async (req, res) => {
  try {
    // 1. Check if user is Organizer or Admin
    if (req.user.role !== "organizer" && req.user.role !== "admin") {
      return res.status(403).json("Only organizers can edit events.");
    }

    // 2. Update the Event info
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!updatedEvent) return res.status(404).json("Event not found.");

    // 3. Find all tickets for this event to get the owners
    const tickets = await Ticket.find({ eventId: req.params.id });
    const userIds = [...new Set(tickets.map((t) => t.userId))]; // Get unique users

    // 4. Fetch the actual email addresses
    const users = await User.find({ _id: { $in: userIds } });
    const emailList = users.map((u) => u.email).filter((email) => email);

    // 5. Send to RabbitMQ Queue 'event_updates'
    if (emailList.length > 0) {
      const connection = await amqp.connect(process.env.RABBIT_URL);
      const channel = await connection.createChannel();
      await channel.assertQueue("event_updates", { durable: true });

      const notificationData = {
        eventTitle: updatedEvent.title,
        newDate: new Date(updatedEvent.date).toLocaleDateString(),
        newLocation: updatedEvent.location,
        emails: emailList,
      };

      channel.sendToQueue(
        "event_updates",
        Buffer.from(JSON.stringify(notificationData)),
        { persistent: true }
      );
      console.log(`Queued ${emailList.length} notification emails.`);
    }

    res.status(200).json(updatedEvent);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

module.exports = router;