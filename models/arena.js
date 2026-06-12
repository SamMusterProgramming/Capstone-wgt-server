

const ArenaSchema = {
    _id: ObjectId,
    user_id: ObjectId,
    arenaName: String,
    slug: String,
    talentType: String,
    region: String,
    city: String,
    biography: String,
    description: String,
    avatar: String,
    banner: String,
    verified: {
      type: Boolean,
      default: false,
    },
    followers: [
      {
        type: ObjectId,
        ref: "User",
      },
    ],
    featuredPerformances: [
      {
        type: ObjectId,
        ref: "Performance",
      },
    ],
    featuredStages: [
      {
        type: ObjectId,
        ref: "Stage",
      },
    ],
    stats: {
      followers: {
        type: Number,
        default: 0,
      },
      views: {
        type: Number,
        default: 0,
      },
      likes: {
        type: Number,
        default: 0,
      },
      performances: {
        type: Number,
        default: 0,
      },
      posts: {
        type: Number,
        default: 0,
      },
    },
    createdAt: Date,
    updatedAt: Date,
  };