const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, auto: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' } // References Room model
});

const User = mongoose.model('User', userSchema);

// Exporting Models 
module.exports = {
  User
};
