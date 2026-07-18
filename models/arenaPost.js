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

    spotlightScore: {
        type: Number,
        default: 0,
    },

    spotlightRegion: {
        type: String,
        index: true
    },

    spotlightCountry: {
        type: String,
        index: true
    },

    lastInteractionAt: {
        type: Date,
        default: Date.now,
    },
    
    globalSpotlight: {
        spotlight: Boolean,
        rank: Number,
        page: Number,
        updatedAt: Date
    },
    
    regionalSpotlight: {
        spotlight: Boolean,
        rank: Number,
        page: Number,
        region: String,
        updatedAt: Date
    },
    
    localSpotlight: {
        spotlight: Boolean,
        rank: Number,
        page: Number,
        country: String,
        updatedAt: Date
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