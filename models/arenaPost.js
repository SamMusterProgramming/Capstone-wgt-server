import mongoose from "mongoose";

const ArenaPostSchema = new mongoose.Schema({
    arena_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Arena",
      required: true,
    },
  
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  
    caption: String,
  
    media: [
      {
        publicUrl: String,
        publicId: String,
        type: String,
      },
    ],
  
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  
    comments: [
      {
        user_id: mongoose.Schema.Types.ObjectId,
        text: String,
        createdAt: Date,
      },
    ],
  
    createdAt: {
      type: Date,
      default: Date.now,
    },
  });

ArenaPostSchema.index({owner_id:1});   
let arenaPostModel = mongoose.model("arenaPosts",ArenaPostSchema);

export default  arenaPostModel ;