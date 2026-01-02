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

console.log("Worker loading... Mongo URI is:", process.env.MONGO_URI ? "FOUND" : "MISSING");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Worker connected to DB"))
  .catch((err) => console.error("DB Connection Error:", err));

// --- EMAIL SETUP ---
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 2525,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    ciphers: "SSLv3"
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  logger: true,
  debug: true
});

// --- HELPER: SEND PURCHASE EMAIL ---
async function sendTicketEmail(userEmail, event, ticket) {
  try {
    const qrImage = await QRCode.toDataURL(ticket.qrCode);
    await transporter.sendMail({
      from: '"Tix App" <tixwebapp@gmail.com>',
      to: userEmail,
      subject: `Confirmation: Ticket for ${event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #ddd; padding: 20px; max-width: 400px; margin: auto;">
          <h2 style="color: #003580;">Ticket Confirmed!</h2>
          <p>You are going to <strong>${event.title}</strong></p>
          <hr/>
          <p style="text-align: left;"><strong>📅 Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
          <p style="text-align: left;"><strong>📍 Location:</strong> ${event.location}</p>
          <p style="text-align: left;"><strong>🎟 Quantity:</strong> ${ticket.quantity}</p>
          <div style="margin: 20px 0;"><img src="cid:ticketqrcode" alt="QR Code" style="width: 200px; height: 200px;" /></div>
        </div>
      `,
      attachments: [{ filename: 'qrcode.png', path: qrImage, cid: 'ticketqrcode' }]
    });
    console.log(`📧 Purchase email sent to ${userEmail}`);
  } catch (error) { console.error("❌ Purchase email failed:", error); }
}

// --- HELPER: SEND MASS NOTIFICATION ---
async function sendUpdateEmail(email, eventTitle, newDate, newLocation) {
  try {
    await transporter.sendMail({
      from: '"Tix App" <tixwebapp@gmail.com>',
      to: email,
      subject: `⚠️ IMPORTANT: Update for ${eventTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #d9534f;">Event Details Updated</h2>
          <p>Hello, the details for <strong>${eventTitle}</strong> have changed. Please note the new information:</p>
          <p><strong>📅 New Date:</strong> ${new Date(newDate).toLocaleDateString()}</p>
          <p><strong>📍 New Location:</strong> ${newLocation}</p>
          <hr/>
          <p style="font-size: 12px; color: #777;">Your existing QR code ticket is still valid for this event.</p>
        </div>
      `
    });
    console.log(`📧 Update email sent to ${email}`);
  } catch (error) { console.error(`❌ Update email failed for ${email}:`, error); }
}

// ... (Keep all your existing code at the top)

async function startWorker() {
  try {
    const connection = await amqp.connect(process.env.RABBIT_URL);
    const channel = await connection.createChannel();
    
    // EXISTING QUEUE: ticket_orders
    const orderQueue = "ticket_orders";
    await channel.assertQueue(orderQueue, { durable: true });

    // NEW QUEUE: event_updates
    const updateQueue = "event_updates";
    await channel.assertQueue(updateQueue, { durable: true });

    console.log("Worker listening for Ticket Orders and Event Updates...");

    // --- CONSUMER 1: TICKET ORDERS (Your existing logic) ---
    channel.consume(orderQueue, async (msg) => {
      if (msg !== null) {
        const orderData = JSON.parse(msg.content.toString());
        try {
          const { eventId, quantity, userId, qrCode } = orderData;
          const event = await Event.findById(eventId);
          if (event && event.sold + quantity <= event.capacity) {
            await Event.findByIdAndUpdate(eventId, { $inc: { sold: quantity } });
            const newTicket = new Ticket({ userId, eventId, quantity, qrCode });
            await newTicket.save();
            const user = await User.findById(userId);
            if (user && user.email) await sendTicketEmail(user.email, event, newTicket);
          }
          channel.ack(msg);
        } catch (err) { channel.nack(msg); }
      }
    });

    // --- CONSUMER 2: EVENT NOTIFICATIONS (New Logic) ---
    channel.consume(updateQueue, async (msg) => {
      if (msg !== null) {
        const { eventTitle, newDate, newLocation, recipientList } = JSON.parse(msg.content.toString());
        try {
          const emailPromises = recipientList.map((email) => 
            transporter.sendMail({
              from: '"Tix App" <tixwebapp@gmail.com>',
              to: email,
              subject: `IMPORTANT: Update for ${eventTitle}`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd;">
                  <h2 style="color: #d9534f;">Event Details Updated</h2>
                  <p>The organizer has updated the details for <strong>${eventTitle}</strong>.</p>
                  <p><strong>📅 New Date:</strong> ${newDate}</p>
                  <p><strong>📍 New Location:</strong> ${newLocation}</p>
                  <p>Your existing ticket is still valid. See you there!</p>
                </div>
              `
            })
          );
          await Promise.all(emailPromises);
          channel.ack(msg);
        } catch (err) { channel.nack(msg); }
      }
    });

  } catch (err) { console.error("RabbitMQ Error:", err); }
}

startWorker();