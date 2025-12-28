const router = require("express").Router();
const User = require("../models/User");
const { verifyTokenAndOrganizer } = require("../middleware/verifyToken"); // We reuse this, or create a specific Admin one

// GET ALL USERS (Admin Only)
router.get("/", verifyTokenAndOrganizer, async (req, res) => {
  try {
    const users = await User.find();
    // Remove passwords before sending data back
    const usersWithoutPassword = users.map((user) => {
      const { password, ...other } = user._doc;
      return other;
    });
    res.status(200).json(usersWithoutPassword);
  } catch (err) {
    res.status(500).json(err);
  }
});

// DELETE USER (Admin Only)
router.delete("/:id", verifyTokenAndOrganizer, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json("User has been deleted...");
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;