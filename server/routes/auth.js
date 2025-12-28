const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const dotenv = require("dotenv"); // <--- Import dotenv

dotenv.config(); // <--- Initialize it

// PASTE YOUR GOOGLE CLIENT ID HERE
const client = new OAuth2Client("485235287216-54jjbt6ebvqvg8o2spr7omtmbpa8e490.apps.googleusercontent.com");

// REGISTER
router.post("/register", async (req, res) => {
  try {
    // 1. Hash the password (encrypt it)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // 2. Create new user
    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      fullName: req.body.fullName,
      role: req.body.role || "attendee"
    });

    // 3. Save to DB
    const user = await newUser.save();
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json(err);
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.status(404).json("User not found!");

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).json("Wrong password!");

    // --- THIS PART IS CRITICAL ---
    // Ensure you have JWT_SECRET in your .env file
    const secret = process.env.JWT_SECRET || "default_secret_key";
    
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      secret,
      { expiresIn: "5d" }
    );

    const { password, ...others } = user._doc;
    // Send the token along with user info
    res.status(200).json({ ...others, accessToken: token });
    // -----------------------------
    
  } catch (err) {
    res.status(500).json(err);
  }
});

// GOOGLE LOGIN / REGISTER ROUTE
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;
    
    // 1. Verify the token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: "485235287216-54jjbt6ebvqvg8o2spr7omtmbpa8e490.apps.googleusercontent.com", // Same ID as above
    });
    const { name, email, picture } = ticket.getPayload();

    // 2. Check if user already exists in OUR database
    let user = await User.findOne({ email });

    if (!user) {
      // 3. If new user, create them automatically
      // We create a secure random password since they won't use it
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      user = new User({
        username: name, // Uses Google Name
        email: email,
        password: randomPassword, // Dummy password to satisfy DB schema
        role: "attendee"
      });
      await user.save();
    }

    // 4. Generate YOUR App's Token (Same as normal login)
    const accessToken = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "5d" }
    );

    const { password, ...others } = user._doc;
    res.status(200).json({ ...others, accessToken });

  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(500).json(err);
  }
});

module.exports = router;