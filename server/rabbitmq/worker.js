console.log("🚨🚨 WORKER FILE IS LOADING... 🚨🚨");

const amqp = require("amqplib");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");

// Load Models
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const User = require("../models/User");

// Load Environment Variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Worker connected to DB"))
  .catch((err) => console.error("DB Connection Error:", err));

// --- EMAIL SETUP ---
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 2525, // Port 2525 bypasses Render firewall
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false }
});

// --- HELPER: SEND TICKET EMAIL ---
async function sendTicketEmail(userEmail, event, ticket) {
  try {
    const qrImage = await QRCode.toDataURL(ticket.qrCode);
    await transporter.sendMail({
      from: '"Tix App" <tixwebapp@gmail.com>', // Verified sender      
      to: userEmail,
      subject: `Confirmation: Ticket for ${event.title}`,
      html: `
        <div style="font-family: Arial; text-align: center; border: 1px solid #ddd; padding: 20px; max-width: 400px; margin: auto;">
          <h2 style="color: #003580;">Ticket Confirmed!</h2>
          <p>You are going to <strong>${event.title}</strong></p>
          <hr/>
          <p>📅 Date: ${new Date(event.date).toLocaleDateString()}</p>
          <p>📍 Location: ${event.location}</p>
          <div style="margin: 20px 0;"><img src="cid:ticketqrcode" width="200" /></div>
        </div>
      `,
      attachments: [{ filename: 'qrcode.png', path: qrImage, cid: 'ticketqrcode' }]
    });
    console.log(`✅ Ticket Email sent to ${userEmail}`);
  } catch (error) { console.error("❌ Ticket Email failed:", error); }
}

// --- HELPER: SEND MASS UPDATE EMAIL ---
async function sendUpdateEmail(email, eventTitle, newDate, newLocation) {
  try {
    await transporter.sendMail({
      from: '"Tix App" <tixwebapp@gmail.com>', // Verified sender
      to: email,
      subject: `⚠️ IMPORTANT: Update for ${eventTitle}`,
      html: `
        <div style="font-family: Arial; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #d9534f;">Event Details Changed</h2>
          <p>The organizer has updated <strong>${eventTitle}</strong>:</p>
          <p><strong>📅 New Date:</strong> ${newDate}</p>
          <p><strong>📍 New Location:</strong> ${newLocation}</p>
          <p>Your QR code is still valid. See you there!</p>
        </div>
      `
    });
    console.log(`✅ Update Email sent to ${email}`);
  } catch (error) { console.error(`❌ Update Email failed for ${email}:`, error); }
}

async function startWorker() {
  try {
    const connection = await amqp.connect(process.env.RABBIT_URL);
    const channel = await connection.createChannel();

    // 1. Listen for Ticket Orders
    const orderQueue = "ticket_orders";
    await channel.assertQueue(orderQueue, { durable: true });
    channel.consume(orderQueue, async (msg) => {
      if (msg !== null) {
        const { eventId, quantity, userId, qrCode } = JSON.parse(msg.content.toString());
        const event = await Event.findById(eventId);
        if (event && event.sold + quantity <= event.capacity) {
          await Event.findByIdAndUpdate(eventId, { $inc: { sold: quantity } });
          const newTicket = new Ticket({ userId, eventId, quantity, qrCode });
          await newTicket.save();
          const user = await User.findById(userId);
          if (user?.email) await sendTicketEmail(user.email, event, newTicket);
        }
        channel.ack(msg);
      }
    });

    // 2. Listen for Event Updates (THE MISSING PIECE)
    const updateQueue = "event_updates";
    await channel.assertQueue(updateQueue, { durable: true });
    channel.consume(updateQueue, async (msg) => {
      if (msg !== null) {
        const { eventTitle, newDate, newLocation, emails } = JSON.parse(msg.content.toString());
        console.log(`📢 Processing updates for ${emails.length} attendees...`);
        
        // Send emails in parallel
        await Promise.all(emails.map(email => sendUpdateEmail(email, eventTitle, newDate, newLocation)));
        
        channel.ack(msg);
      }
    });

    console.log("🚀 Worker is watching both Order and Update queues...");
  } catch (err) { console.error("RabbitMQ Connect Error:", err); }
}

startWorker();