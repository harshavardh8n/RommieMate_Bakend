const express = require("express");
const { Expense } = require("../db/expenseSchema");
const { Room } = require("../db/roomSchema");
const { User } = require("../db/userSchema");
const { Invitation } = require("../db/invitationSchema");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userMiddleware = require("../middlewares/userMiddleware");
const { SECRET_KEY } = require("../config");
// require('dotenv').config()

const expenseRouter = express.Router()

const SECRET_KEY = SECRET_KEY;
// DONE


expenseRouter.get("/expenses/:roomid",async(req,res)=>{
    try {

        const { roomId } = req.params;
        const expenses = await Expense.find({ room_id: roomId });
        return res.status(200).json({ room_id: roomId, expenses });
        
    } catch (error) {
       return res.status(500).json({ error: error.message });
    }
})


// DONE
expenseRouter.post("/expenses",async(req,res)=>{
    try {

        const { amount, expenseDesc, roomId, payerId, splittersIds } = req.body;

        const share = amount / (splittersIds.length + 1);
        const newExpense = new Expense({
            amount,
            expenseDesc,
            roomId,
            payerId,
            splittersIds,
            share,
          });
          await newExpense.save();
        res.status(201).json({ success: true, message: 'Expense added successfully!', expense: newExpense });

        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})


// DONE
expenseRouter.get('/rooms/:roomId/members', async (req, res) => {
    try {
        
      const { roomId } = req.params;
      const room = await Room.findById(roomId).populate('members');
      if (!room) return res.status(404).json({ error: 'Room not found' });
      res.status(200).json({ roomId, members: room.members });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


//   DONE
  expenseRouter.get('/expenses/owed/:roomId/:userAId/:userBId', async (req, res) => {
    try {
      const { roomId, userAId, userBId } = req.params;
  
      const expenses = await Expense.find({ roomId });
  
      let userAOwesUserB = 0;
      let userBOwesUserA = 0;
  
      expenses.forEach((expense) => {
        if (expense.payerId.toString() === userBId && expense.splittersIds.includes(userAId)) {
            // console.log(expense._id)
          userAOwesUserB += expense.share;
        //   console.log(userAOwesUserB)

        } else if (expense.payerId.toString() === userAId && expense.splittersIds.includes(userBId)) {
            // console.log(expense._id)
          userBOwesUserA += expense.share;
        //   console.log(userBOwesUserA)
        }
      });

    //   console.log(userAOwesUserB,userBOwesUserA)
  
      const amountOwed = userAOwesUserB - userBOwesUserA;
      res.status(200).json({ roomId, userA: userAId, userB: userBId, amount_owed: amountOwed });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// DONE (ADD_MEMBER)
expenseRouter.put('/rooms/:roomId/members', async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;
  
      const room = await Room.findByIdAndUpdate(
        roomId,
        { $push: { members: userId } },
        { new: true }
      ).populate('members');
  
      if (!room) return res.status(404).json({ error: 'Room not found' });
      res.status(200).json({ success: true, message: 'Member added successfully!', room });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


//   DONE
//   expenseRouter.post('/rooms', async (req, res) => {
//     try {
//         const { members, admin } = req.body; // Members should include all users including admin

//         if (!admin) {
//             return res.status(400).json({ success: false, message: "Admin is required to create a room." });
//         }

//         if (!members || !Array.isArray(members) || members.length === 0) {
//             return res.status(400).json({ success: false, message: "Members array is required and cannot be empty." });
//         }

//         // Ensure admin is included in the members list
//         if (!members.includes(admin)) {
//             members.push(admin);
//         }

//         const newRoom = new Room({ members, admin }); // Add the admin field
//         await newRoom.save();

//         res.status(201).json({ success: true, message: 'Room created successfully!', room: newRoom });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });


 // Import Invitation model

 expenseRouter.post('/rooms', userMiddleware, async (req, res) => {
  try {
      const { members, admin } = req.body; // Members should include users to be invited (excluding admin)

      if (!admin) {
          return res.status(400).json({ success: false, message: "Admin is required to create a room." });
      }

      if (!members || !Array.isArray(members) || members.length === 0) {
          return res.status(400).json({ success: false, message: "Members array is required and cannot be empty." });
      }

      // Ensure admin is included in the members list
      if (!members.includes(admin)) {
          members.push(admin);  // Just for the sake of room creation, we'll add the admin here
      }

      // Create the room with only the admin (others will be invited)
      const newRoom = new Room({ members: [admin], admin }); // Only add admin to the room initially
      await newRoom.save();

      // Create invitations for other members (excluding the admin)
      for (let userId of members) {
          if (userId !== admin) {
              const invitation = new Invitation({
                  userId,
                  senderId: admin,  // Use admin as senderId
                  roomId: newRoom._id,
                  status: "pending"
              });
              await invitation.save();

              // Optionally, send a notification or email to the user about the invitation
          }
      }

      console.log({
          success: true, 
          message: 'Room created successfully! Invitations sent.', 
          roomId: newRoom._id,  
          room: newRoom 
      });

      res.status(201).json({
          success: true, 
          message: 'Room created successfully! Invitations sent.',
          roomId: newRoom._id,  
          room: newRoom 
      });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});


expenseRouter.get('/getInvites', userMiddleware, async (req, res) => {
  try {
    const userId = req.userId;  // Assuming userMiddleware attaches user object to req.user

    // Find all invitations where the user is either the inviter or the invitee
    const invites = await Invitation.find({ userId })
      .populate('roomId')          // Populate the roomId field to get room details
      .populate('senderId', 'name'); // Populate senderId to get the admin's name (only the name field)

    if (invites.length === 0) {
      return res.status(404).json({ success: false, message: 'No invitations found for this user.' });
    }

    // Add the number of members in each room (roommates) to the invitation object and replace userId with admin's name
    const invitesWithRoommates = invites.map(invite => {
      const numberOfMembers = invite.roomId.members.length;  // Get the number of members in the room
      return {
        ...invite.toObject(),  // Convert invite to plain JavaScript object
        roommates: numberOfMembers,  // Add the number of members (roommates) in the room
        Admin: invite.senderId.name  // Replace senderId with the admin's name
      };
    });

    res.status(200).json({
      success: true,
      invites: invitesWithRoommates
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'An error occurred while fetching invitations.' });
  }
});





// DONE'
expenseRouter.post('/users', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: "Name, email, and password are required" });
        }

        // Check if the email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email is already registered" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
        });
        await newUser.save();

        // Generate JWT
        const token = jwt.sign(
            { userId: newUser._id, email: newUser.email },
            SECRET_KEY,
            { expiresIn: "1h" } // Token valid for 1 hour
        );

        res.status(201).json({
            success: true,
            message: "User created successfully!",
            user: { id: newUser._id, name: newUser.name, email: newUser.email },
            token,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

expenseRouter.get('/idlePeople', userMiddleware, async (req, res) => {
  try {
    // Get all users
    const allUsers = await User.find({}, '_id name email');
    const userId = req.userId;  // Get the current user's ID from the middleware

    // Get all room members
    const rooms = await Room.find({}, 'members');
    const roomMembers = new Set(rooms.flatMap(room => room.members.map(member => member.toString())));

    // Find idle people (users not in any room)
    const idlePeople = allUsers.filter(user => 
      !roomMembers.has(user._id.toString()) && user._id.toString() !== userId
    );

    res.status(200).json({ idlePeople });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Accept Invitation Endpoint
expenseRouter.post('/acceptInvitations', userMiddleware, async (req, res) => {
  try {

    const { invitationId } = req.body;  // Get the invitation ID from the body
    const userId = req.userId;  // User ID from middleware
    console.log("invitation id"+invitationId);
    console.log("User id"+userId);
    // Check if invitation exists
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found.' });
    }

    // Ensure that the invitation is for the current user
    if (invitation.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot accept this invitation.' });
    }

    // Find the room and add the user to the members list
    const room = await Room.findByIdAndUpdate(
      invitation.roomId,
      { $push: { members: userId } },
      { new: true } // Return the updated room
    );

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    // Delete all invitations for the current user (since the user accepted it)
    await Invitation.deleteMany({ userId });

    // Respond with success
    res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully! You have been added to the room.',
      room,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'An error occurred while accepting the invitation.' });
  }
});


// Other routes...

module.exports = { expenseRouter };

