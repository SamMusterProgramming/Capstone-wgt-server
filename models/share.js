import mongoose from "mongoose";

const shareSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    contentType: {
      type: String,
      enum: [
        "arena",
        "stage",
        "performance",
        "profile",
      ],
      required: true,
    },

    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

shareSchema.index({
  recipientId: 1,
  createdAt: -1,
});

const ShareModal = mongoose.model("Share", shareSchema);

export default ShareModal;