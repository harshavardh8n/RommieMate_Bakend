const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../db/userSchema");
const { Room } = require("../db/roomSchema");
const { SECRET_KEY } = require("../config");
const userRouter = express.Router();

// const SECRET_KEY = SECRET_KEY; // Replace with a secure secret key


userRouter.get("/tester", async (req, res) => {
    return res.status(200).json({mssg:"Inside works properly"})
});

// Login route with JWT and check if the user is part of any room
userRouter.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid password" });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email }, 
            SECRET_KEY, 
            { expiresIn: "1h" } // Token expires in 1 hour
        );

        // Check if the user is part of any room
        const room = await Room.findOne({ members: user._id });
        const roomId = room ? room._id : null;  // If user is in a room, return the roomId, else null

        return res.status(200).json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email },
            roomId  // Return roomId or null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



userRouter.get("/search", async (req, res) => {
    try {
        const searchQuery = req.query.name || ""; // Get the search query from the request
        console.log("Search query:", searchQuery);

        // Find users where the name field matches the search query (case-insensitive)
        const users = await User.find({
            name: { $regex: searchQuery, $options: "i" } // Case-insensitive search
        });

        // Map the user data to return only relevant fields
        const formattedUsers = users.map(user => ({
            userId: user._id,
            name: user.name,
            email: user.email,
        }));

        res.status(200).json({ users: formattedUsers });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


module.exports = { userRouter };
