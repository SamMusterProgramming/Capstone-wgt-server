import mongoose from "mongoose";

const ArenaSchema = new mongoose.Schema({
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    arenaName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    talentType: {
      type: String,
      required: true,
      enum: [
        "Sport",
        "Fitness",
        "Art",
        "Singing",
        "Dance",
        "Music",
        "Comedy",
        "Magic"
      ],
    },
    region: {
      type: String,
      required: true,
    },
    biography: {
      type: String,
      maxlength: 300,
    },
    description: {
      type: String,
      maxlength: 800,
    },
    coverImage: {
      publicUrl: String,
      fileId : String,
      fileName : String
    },
    profileImage: {
      publicUrl: String,
      fileId : String,
      fileName : String
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ArenaPost",
      },
    ],
    likes: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }    
);
ArenaSchema.index({owner_id:1});   
let arenaModel = mongoose.model("arenas",ArenaSchema);
export default  arenaModel;