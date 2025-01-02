const express = require("express");
const { Expense } = require("../db/expenseSchema");
const { Payment } = require("../db/paymentSchema");
const { Room } = require("../db/roomSchema");
const { User } = require("../db/userSchema");
const checkUserRoom = require("../middlewares/checkUserRoom");
const userMiddleware = require("../middlewares/userMiddleware");
const expenseHandler = express.Router();

expenseHandler.get("/",(req,res)=>{
    res.send("route works")
})
expenseHandler.post('/add', userMiddleware, checkUserRoom, async (req, res) => {
  try {
    const { amount, expenseDesc, roomId, splittersIds } = req.body;
    const payerId = req.userId;
    if (!amount || !expenseDesc || !roomId || !payerId || !splittersIds) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Calculate share per user
    const share = amount / splittersIds.length;

    // Create the expense
    const expense = new Expense({
      amount,
      expenseDesc,
      roomId,
      payerId,
      splittersIds,
      share,
    });

    await expense.save();

    // Update balances for splitters
    for (const splitterId of splittersIds) {
      if (splitterId !== payerId) {
        await User.updateOne(
          { _id: payerId },
          { $inc: { [`balances.${splitterId}`]: share } }
        );

        await User.updateOne(
          { _id: splitterId },
          { $inc: { [`balances.${payerId}`]: -share } }
        );
      }
    }

    // Fetch updated balances for the payer
    const updatedUser = await User.findById(payerId, 'balances');

    // Respond with success and updated balances
    res.status(201).json({
      message: 'Expense added successfully',
      updatedBalances: updatedUser.balances,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});





  expenseHandler.get('/room',userMiddleware,checkUserRoom, async (req, res) => {
    try {
      const roomId = req.roomId;
  
      // Debugging: log the roomId to ensure it's being passed correctly
      console.log(`Fetching expenses for room: ${roomId}`);
  
      const expenses = await Expense.find({ roomId }).populate('payerId splittersIds', 'name email');
  
      if (!expenses.length) {
        return res.status(404).json({ message: 'No expenses found for this room' });
      }
  
      res.status(200).json(expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error); // Log the error for debugging
      res.status(500).json({ message: 'Server error' });
    }
  });
  
// ......................................................................



// // Function to calculate net balance for each user

  
//   // Route to fetch the net balance of each user
//   expenseHandler.get('/balances', userMiddleware, checkUserRoom, async (req, res) => {
//     const roomId = req.roomId;
//     const userId = req.userId;
  
//     try {
//       // Fetch the room by roomId
//       const room = await Room.findById(roomId).populate('members');
      
//       if (!room || !room.members || room.members.length === 0) {
//         return res.status(404).json({ message: 'No users found for this room' });
//       }
  
//       // Calculate net balances for the specified room
//       const netBalances = await calculateNetBalance(roomId);
  
//       // Get the current user's net balance
//       const userNetBalance = netBalances[userId] || 0;
  
//       // Map users to their respective balances
//       const usersBalances = room.members.map((user) => {
//         return {
//           userId: user._id,
//           name: user.name,
//           balance: netBalances[user._id.toString()] || 0, // Ensure the ID matches
//         };
//       });
  
//       res.json({
//         userNetBalance,
//         usersBalances,
//       });
//     } catch (error) {
//       console.error('Error fetching balances:', error);
//       res.status(500).json({ message: 'Error calculating balances' });
//     }
//   });



// ......................................................................


const calculateNetBalanceWithUser = async (roomId, loggedInUserId) => {
    try {
      const expenses = await Expense.find({ roomId }).populate('payerId splittersIds');
      const userExpenses = {};
      
      // Initialize the logged-in user's balance
      let loggedInUserBalance = 0;
      
      expenses.forEach(expense => {
        const { payerId, splittersIds, amount, share } = expense;
    
        // Initialize payer's expense tracking if not already
        if (!userExpenses[payerId._id]) {
          userExpenses[payerId._id] = { totalSpent: 0, totalOwed: 0 };
        }
        userExpenses[payerId._id].totalSpent += amount;
    
        // Loop through each splitter
        splittersIds.forEach(splitterId => {
          if (!userExpenses[splitterId._id]) {
            userExpenses[splitterId._id] = { totalSpent: 0, totalOwed: 0 };
          }
          userExpenses[splitterId._id].totalOwed += share;
        });
      });
    
      // Calculate net balances for each user
      const netBalances = {};
      for (const userId in userExpenses) {
        const { totalSpent, totalOwed } = userExpenses[userId];
        netBalances[userId] = totalSpent - totalOwed;
      }
    
      // Get the logged-in user's balance
      loggedInUserBalance = netBalances[loggedInUserId] || 0;
  
      return { loggedInUserBalance, userBalances: netBalances };
    } catch (error) {
      console.error('Error calculating net balance:', error);
      throw error;
    }
  };
  
  
  
  // New route to fetch the net balance of each user with respect to the logged-in user
  // New route to fetch the net balance of each user with respect to the logged-in user
  expenseHandler.get('/net-balance', userMiddleware, checkUserRoom, async (req, res) => {
    const roomId = req.roomId;
    const loggedInUserId = req.userId;
  
    try {
      // Fetch the room and its members
      const room = await Room.findById(roomId).populate('members');
      if (!room || !room.members || room.members.length === 0) {
        return res.status(404).json({ message: 'No users found for this room' });
      }
  
      // Fetch the logged-in user and recalculate balances
      const loggedInUser = await User.findById(loggedInUserId);
      if (!loggedInUser) {
        return res.status(404).json({ message: 'Logged-in user not found' });
      }
  
      // Calculate balances using the most recent data
      const roommateBalances = await Promise.all(
        room.members.map(async (member) => {
          if (member._id.toString() === loggedInUserId.toString()) return null; // Exclude logged-in user
          const roommate = await User.findById(member._id); // Fetch latest roommate data
          const netWithUser = loggedInUser.balances.get(member._id.toString()) || 0;
          return {
            userId: roommate._id,
            name: roommate.name,
            netWithUser, // The amount logged-in user owes or is owed by this roommate
          };
        })
      );
  
      // Filter out null values (for logged-in user)
      const filteredRoommateBalances = roommateBalances.filter(balance => balance !== null);
  
      // Total net balance for the logged-in user
      const loggedInUserBalance = Array.from(loggedInUser.balances.values()).reduce((acc, val) => acc + val, 0);
  
      res.json({
        userNetBalance: loggedInUserBalance,
        roommateBalances: filteredRoommateBalances,
      });
    } catch (error) {
      console.error('Error fetching balances:', error);
      res.status(500).json({ message: 'Error calculating balances' });
    }
  });
    
  




// ......................................................................



// const calculateNetBalance = async (roomId) => {
//     try {
//       // Step 1: Fetch all expenses for the room
//       const expenses = await Expense.find({ roomId }).populate('payerId splittersIds');
  
//       // Step 2: Initialize an object to store total spent and balances for each user
//       const userExpenses = {};
      
//       // Step 3: Calculate total spending and balances for each user
//       expenses.forEach(expense => {
//         const { payerId, splittersIds, amount, share } = expense;
  
//         // Initialize payer's expense tracking if not already
//         if (!userExpenses[payerId._id]) {
//           userExpenses[payerId._id] = { totalSpent: 0, totalOwed: 0 };
//         }
//         userExpenses[payerId._id].totalSpent += amount;  // payer spent the full amount
  
//         // Loop through each splitter
//         splittersIds.forEach(splitterId => {
//           if (!userExpenses[splitterId._id]) {
//             userExpenses[splitterId._id] = { totalSpent: 0, totalOwed: 0 };
//           }
//           userExpenses[splitterId._id].totalOwed += share;  // Each splitter owes 'share' amount
//         });
//       });
  
//       // Step 4: Calculate net balances for each user (Spent - Owed)
//       const netBalances = {};
//       for (const userId in userExpenses) {
//         const { totalSpent, totalOwed } = userExpenses[userId];
//         netBalances[userId] = totalSpent - totalOwed;
//       }
  
//       return netBalances;
//     } catch (error) {
//       console.error('Error calculating net balance:', error);
//       throw error;
//     }
//   };


expenseHandler.post('/pay-roommate', userMiddleware, checkUserRoom, async (req, res) => {
  const roomId = req.roomId;
  const loggedInUserId = req.userId;
  const { roommateId, amount } = req.body;

  try {
    console.log('Request data:', { loggedInUserId, roommateId, amount });
    console.log('roomId:', roomId);

    // Fetch the logged-in user's balances
    const loggedInUserData = await User.findById(loggedInUserId, { balances: 1 });
    if (!loggedInUserData) {
      return res.status(404).json({ message: 'Logged-in user not found' });
    }

    // Debug balances
    console.log('Logged-in user balances:', loggedInUserData.balances);

    // Retrieve balance with the specific roommate
    const currentBalanceWithRoommate = loggedInUserData.balances.get(roommateId) || 0;
    console.log(`Balance with roommate (${roommateId}):`, currentBalanceWithRoommate);


    // Validation
    if (currentBalanceWithRoommate >= 0) {
      return res.status(400).json({ message: 'You are expecting money from this user, not owing' });
    }

    if (Math.abs(currentBalanceWithRoommate) < amount) {
      return res.status(400).json({ message: 'Amount exceeds the money you owe' });
    }

    // Update balances
    const payerUpdate = await User.updateOne(
      { _id: loggedInUserId },
      { $inc: { [`balances.${roommateId}`]: amount } } // Reduce debt
    );
    const receiverUpdate = await User.updateOne(
      { _id: roommateId },
      { $inc: { [`balances.${loggedInUserId}`]: -amount } } // Adjust credit
    );

    // Debug update results
    console.log('Payer update result:', payerUpdate);
    console.log('Receiver update result:', receiverUpdate);

    // Fetch updated balances
    const updatedBalances = await User.findById(loggedInUserId, { balances: 1 });

    res.json({
      message: 'Payment successful',
      updatedBalances,
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Error processing payment' });
  }
});



  


// ......................................................................





  


module.exports = {expenseHandler}