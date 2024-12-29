const jwt = require('jsonwebtoken');
const { Room } = require('../db/roomSchema');  // Assuming the Room schema is imported correctly
const SECRET_KEY = process.env.SECRET_KEY;

// Middleware to check if user has a room
const checkUserRoom = async (req, res, next) => {
  try {
    // Step 1: Get the token from the Authorization header
    const token = req.headers['authorization']?.split(' ')[1]; // Extract token from "Bearer <token>"
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    // console.log(token)
    // Step 2: Verify the token and extract user info
    const decoded = jwt.verify(token, SECRET_KEY); // Use the secret to verify the token
    // console.log(decoded);
    req.userId = decoded.userId; // Save user ID in request for later use
    // Step 3: Check if the user is a member of any room using $in operator
    // console.log("------------------------------------")
    // console.log(req.userId)
    // console.log("------------------------------------")
    const room = await Room.findOne({ members: { $in: [req.userId] } }); // Check if userId is in the members array
    
    if (!room) {
      return res.status(404).json({ message: 'User does not belong to any room' });
    }
    // Step 4: If the user is part of a room, set the roomId on the request object
    req.roomId = room._id; // Set the roomId in the request for later use
    
    // console.log(req.roomId+"---------")
    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = checkUserRoom;
