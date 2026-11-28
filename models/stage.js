
import mongoose from "mongoose";

// Contestant schema
const contestantSchema = new mongoose.Schema({

  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },

  performances: [],

  votes: {
    type: Number,
    default: 0,
  },

  likes: {
    type: Number,
    default: 0,
  },

  rank: {
    type: Number,
    default: 0,
  },

  voteCount :{
    type: Number,
    default: 0,
  },

  likeCount :{
    type: Number,
    default: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

}, { _id: true });


// Stage schema
const stageSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true,
  },

  talentType: {
    type: String,
    required: true,
    trim: true,
  },

  region: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },

  contestants: {
    type: [contestantSchema],
    default: [],
  },

  eliminations: {
    type: [contestantSchema],
    default: [],
  },

  queue: {
    type: [contestantSchema],
    default: [],
  },

  invitedContestants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  }],

  voters: [],

  editions: [],

  desc: {
    type: String,
    default: "add description",
  },

  MAXCONTESTANTS: {
    type: Number,
    default: 22,
  },

  thumbNail_URL: {
    type: String,
  },

  comments: [],

}, {
  timestamps: true,
  versionKey: false,
});


// One stage per talent type per region
stageSchema.index(
  { region: 1, talentType: 1 },
  { unique: true }
);
// Find stages containing a contestant
stageSchema.index({
    "contestants.user_id": 1,
  });
  
  // Find stages containing a queued contestant
  stageSchema.index({
    "queue.user_id": 1,
  });
  
  // Find stages containing an eliminated contestant
  stageSchema.index({
    "eliminations.user_id": 1,
  });

const stageModel = mongoose.model("stages", stageSchema);

export default stageModel;
