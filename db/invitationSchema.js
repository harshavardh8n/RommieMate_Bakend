const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderId:{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    roomId:{ type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"
    },
    sentAt: { type: Date, default: Date.now }
});

const Invitation = mongoose.model("Invitation", invitationSchema);
module.exports = { Invitation };