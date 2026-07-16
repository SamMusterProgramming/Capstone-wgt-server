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
    spotlightPage : {
        type: Number,
        default: 999,
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
    
    spotlightRank: {
        type: Number,
        default: null
    },
    spotlightRegion: {
        type: String,
        index: true
    },
    lastInteractionAt: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    spotlightUpdatedAt: {
        type: Date,
        default: null
    }
  },
  { versionKey: false }    
);

ArenaPostSchema.index({owner_id:1});   
ArenaPostSchema.index({ spotlightScore: -1 });
ArenaPostSchema.index({ createdAt: -1 });
ArenaPostSchema.index({ lastInteractionAt: -1 });
ArenaPostSchema.index({
    spotlightScore: -1,
    createdAt: -1
});

let arenaPostModel = mongoose.model("ArenaPost",ArenaPostSchema);
export default  arenaPostModel ;