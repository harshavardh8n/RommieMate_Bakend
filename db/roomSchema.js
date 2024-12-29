const mongoose = require("mongoose")
const RoomSchema = new mongoose.Schema({
//   roomId: { type: mongoose.Schema.Types.ObjectId, auto: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of User references
  admin:{ type: mongoose.Schema.Types.ObjectId, ref:"User"}
});

const Room = mongoose.model('Room', RoomSchema);

module.exports = {
    Room
  };
  