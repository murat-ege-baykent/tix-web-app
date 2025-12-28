const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

// Import Routes
const authRoute = require("./routes/auth");
const eventRoute = require("./routes/events");
const userRoute = require("./routes/users");
const ticketRoute = require("./routes/tickets"); // <--- MAKE SURE THIS IS HERE ONLY ONCE

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB Connection Successfull!"))
  .catch((err) => {
    console.error(err);
  });

app.use(cors({
  origin: [
    "http://localhost:5173", // Keep local for testing
    process.env.CLIENT_URL   // The future Vercel URL
  ],
  credentials: true
}));
app.use(express.json());

// Use Routes
app.use("/api/auth", authRoute);
app.use("/api/events", eventRoute);
app.use("/api/users", userRoute);
app.use("/api/tickets", ticketRoute); // <--- IMPORTANT: Must be here

app.listen(3000, () => {
  console.log("Backend server is running!");
});

require("./rabbitmq/worker");