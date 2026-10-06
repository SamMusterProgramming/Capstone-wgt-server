import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled"],
      default: "pending",
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    versionKey: false,
  }
);

/*
 * Find requests sent by a user.
 */
friendRequestSchema.index({
  sender: 1,
  status: 1,
  createdAt: -1,
});

/*
 * Find requests received by a user.
 */
friendRequestSchema.index({
  receiver: 1,
  status: 1,
  createdAt: -1,
});


friendRequestSchema.index(
  {
    sender: 1,
    receiver: 1,
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "pending",
    },
  }
);

const friendRequestModel = mongoose.model(
  "FriendRequest",
  friendRequestSchema
);

export default friendRequestModel;