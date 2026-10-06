import mongoose from "mongoose";

const friendshipSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

friendshipSchema.index(
  { user1: 1, user2: 1 },
  { unique: true }
);


friendshipSchema.index({ user1: 1 });
friendshipSchema.index({ user2: 1 });

const friendshipModel = mongoose.model(
  "Friendship",
  friendshipSchema
);

export default friendshipModel;