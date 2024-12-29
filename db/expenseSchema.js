const mongoose = require("mongoose")

const ExpenseSchema = new mongoose.Schema({
    // expenseId: { type: mongoose.Schema.Types.ObjectId, auto: true },
    amount: { type: Number, required: true },
    expenseDesc: { type: String, required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true }, // References Room
    payerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // References User
    splittersIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users splitting the expense
    share: { type: Number, required: true } // Share amount per splitter
  },
  { timestamps: true });
  
  const Expense = mongoose.model('Expense', ExpenseSchema);
  
  module.exports = {
    Expense
  };
  