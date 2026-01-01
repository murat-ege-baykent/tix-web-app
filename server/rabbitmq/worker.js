console.log("🚨🚨 WORKER FILE IS LOADING... 🚨🚨"); // <--- ADD THIS

const amqp = require("amqplib");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode"); // <--- NEW IMPORT

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

// --- EMAIL SETUP (BREVO) ---
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com", // <--- MUST MATCH BREVO SERVER
  port: 587,                    // Brevo standard port
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  logger: true,
  debug: true
});

// Helper function to send email with QR Image
async function sendTicketEmail(userEmail, event, ticket) {
  try {
    // 1. Generate QR Code Image as a Data URL
    const qrImage = await QRCode.toDataURL(ticket.qrCode);

    // 2. Send Email with Embedded Image
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
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
          
          <div style="margin: 20px 0;">
            <img src="cid:ticketqrcode" alt="QR Code" style="width: 200px; height: 200px;" />
          </div>
          
          <p style="font-size: 12px; color: #555;">Scan this code at the entrance.</p>
        </div>
      `,
      attachments: [
        {
          filename: 'qrcode.png',
          path: qrImage, // The Base64 image data
          cid: 'ticketqrcode' // MATCHES the src in the HTML above
        }
      ]
    });
    console.log(`📧 Email sent to ${userEmail}`);
  } catch (error) {
    console.error("❌ Email failed:", error);
  }
}

async function startWorker() {
  try {
    const connection = await amqp.connect(process.env.RABBIT_URL);
    const channel = await connection.createChannel();
    const queue = "ticket_orders";

    await channel.assertQueue(queue, { durable: true });
    console.log(`Waiting for messages in ${queue}...`);

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        const orderData = JSON.parse(msg.content.toString());
        console.log("Processing order for User:", orderData.userId);

        try {
          const { eventId, quantity, userId, qrCode } = orderData;
          const event = await Event.findById(eventId);
          
          if (event && event.sold + quantity <= event.capacity) {
            // 1. Update DB
            await Event.findByIdAndUpdate(eventId, { $inc: { sold: quantity } });

            // 2. Create Ticket
            const newTicket = new Ticket({ userId, eventId, quantity, qrCode });
            await newTicket.save();
            console.log("✅ Ticket created successfully!");

            // 3. Send Email
            const user = await User.findById(userId);
            if (user && user.email) {
                console.log(`Found user email: ${user.email}. Generating QR and Sending...`);
                await sendTicketEmail(user.email, event, newTicket);
            } else {
                console.log("User has no email in DB, skipping email.");
            }

          } else {
             console.log("❌ Purchase failed: Not enough capacity.");
          }

          channel.ack(msg);
        } catch (err) {
          console.error("Worker Error:", err);
          channel.nack(msg);
        }
      }
    });
  } catch (err) {
    console.error("RabbitMQ Connect Error:", err);
  }
}

startWorker();