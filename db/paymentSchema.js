const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  payerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = {Payment};
