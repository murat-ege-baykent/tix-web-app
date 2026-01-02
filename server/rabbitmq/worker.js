console.log("🚨🚨 WORKER FILE IS LOADING... 🚨🚨");

const amqp = require("amqplib");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");

const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const User = require("../models/User");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Worker connected to DB"))
  .catch((err) => console.error("DB Connection Error:", err));

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 2525, 
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false }
});

async function sendTicketEmail(userEmail, event, ticket) {
  try {
    const qrImage = await QRCode.toDataURL(ticket.qrCode);
    await transporter.sendMail({
      from: '"Tix App" <tixwebapp@gmail.com>',      
      to: userEmail,
      subject: `Confirmation: Ticket for ${event.title}`,
      html: `<div style="font-family: Arial; text-align: center; border: 1px solid #ddd; padding: 20px; max-width: 400px; margin: auto;">
               <h2 style="color: #003580;">Ticket Confirmed!</h2>
               <p>You are going to <strong>${event.title}</strong></p>
               <hr/><p>📅 Date: ${new Date(event.date).toLocaleDateString()}</p>
               <p>📍 Location: ${event.location}</p>
               <div style="margin: 20px 0;"><img src="cid:ticketqrcode" width="200" /></div>
             </div>`,
      attachments: [{ filename: 'qrcode.png', path: qrImage, cid: 'ticketqrcode' }]
    });
    console.log(`✅ Ticket Email sent to ${userEmail}`);
  } catch (error) { console.error("❌ Ticket Email failed:", error); }
}

// Updated mass email helper to handle waitlist vs updates
async function sendMassEmail(email, eventTitle, newDate, newLocation, isWaitlistAlert) {
  try {
    const subject = isWaitlistAlert 
      ? `🔥 TICKETS AVAILABLE: ${eventTitle}` 
      : `⚠️ IMPORTANT: Update for ${eventTitle}`;

    const htmlContent = isWaitlistAlert
      ? `<div style="font-family: Arial; padding: 20px; border: 2px solid #28a745; border-radius: 10px;">
          <h2 style="color: #28a745;">Good News! Tickets are available!</h2>
          <p>Capacity for <strong>${eventTitle}</strong> has been increased. Grab yours now before they are gone!</p>
          <p>📅 Date: ${newDate} | 📍 Location: ${newLocation}</p>
          <p>Head to the app to purchase now.</p>
         </div>`
      : `<div style="font-family: Arial; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #d9534f;">Event Details Changed</h2>
          <p>The organizer has updated <strong>${eventTitle}</strong>:</p>
          <p><strong>📅 New Date:</strong> ${newDate}</p>
          <p><strong>📍 New Location:</strong> ${newLocation}</p>
          <p>Your QR code is still valid. See you there!</p>
        </div>`;

    await transporter.sendMail({
      from: '"Tix App" <tixwebapp@gmail.com>',
      to: email,
      subject: subject,
      html: htmlContent
    });
    console.log(`✅ ${isWaitlistAlert ? "Waitlist" : "Update"} Email sent to ${email}`);
  } catch (error) { console.error(`❌ Email failed for ${email}:`, error); }
}

async function startWorker() {
  try {
    const connection = await amqp.connect(process.env.RABBIT_URL);
    const channel = await connection.createChannel();

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

    const updateQueue = "event_updates";
    await channel.assertQueue(updateQueue, { durable: true });
    channel.consume(updateQueue, async (msg) => {
      if (msg !== null) {
        const { eventTitle, newDate, newLocation, emails, isWaitlistAlert } = JSON.parse(msg.content.toString());
        await Promise.all(emails.map(email => sendMassEmail(email, eventTitle, newDate, newLocation, isWaitlistAlert)));
        channel.ack(msg);
      }
    });

    console.log("🚀 Worker is watching Order and Update/Waitlist queues...");
  } catch (err) { console.error("RabbitMQ Connect Error:", err); }
}

startWorker();