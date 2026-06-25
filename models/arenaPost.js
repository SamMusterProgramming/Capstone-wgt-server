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
  
    caption: {
        type: String,
        maxlength: 1000,
      },

    // automatic discovery system

    spotlight: {
        type: Boolean,
        default: false,
    },

    spotlightScore: {
        type: Number,
        default: 0,
    },
    
    media: {
        video: {
          cdnUrl: String,
          fileId: String,
          fileName : String
        },
        thumbnail: {
          cdnUrl: String,
          fileId: String,
          fileName : String
        },
    },

    // ---------- ENGAGEMENT ----------
  
    fires: [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    ],
  
    comments: [
        {
          user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
    
          text: {
            type: String,
            maxlength: 500,
          },
    
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
    ],

    views: {
        type:Number,
        default:0
      },

    // ---------- COUNTERS ----------

    viewCount: {
        type: Number,
        default: 0,
    },

    fireCount: {
        type: Number,
        default: 0,
    },

    commentCount: {
        type: Number,
        default: 0,
    },

    shareCount: {
        type: Number,
        default: 0,
    },

    // ---------- DISCOVERY ----------

    lastInteractionAt: {
        type: Date,
        default: Date.now,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }    
);

ArenaPostSchema.index({owner_id:1});   
let arenaPostModel = mongoose.model("arenaPosts",ArenaPostSchema);

export default  arenaPostModel ;