const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.token;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    
    // CHECK: Ensure this matches your .env file variable name (usually JWT_SEC)
    const secret = process.env.JWT_SEC || process.env.JWT_SECRET;

    jwt.verify(token, secret, (err, user) => {
      if (err) return res.status(403).json("Token is not valid!");
      req.user = user;
      next();
    });
  } else {
    return res.status(401).json("You are not authenticated!");
  }
};

const verifyTokenAndOrganizer = (req, res, next) => {
  verifyToken(req, res, () => {
    // Allows if user is Admin OR Organizer
    if (req.user.role === "organizer" || req.user.role === "admin") {
      next();
    } else {
      res.status(403).json("You are not allowed to do that!");
    }
  });
};

const verifyTokenAndAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === "admin") {
      next();
    } else {
      res.status(403).json("You are not allowed to do that!");
    }
  });
};

module.exports = { verifyToken, verifyTokenAndOrganizer, verifyTokenAndAdmin };