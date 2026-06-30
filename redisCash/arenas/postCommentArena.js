import mongoose from "mongoose";
import redis from "../../config/redis.js";
import arenaPostCommentModel from "../../models/arena/postArena/arenaPostComment.js";


const POST_COMMENTS_CACHE_SECONDS = 60 * 5;

const postCommentArena = async (
  postId,
  refreshCache = false
) => {
  try {
    const cacheKey = `post_comments_${postId}`;

    // ---------- REDIS ----------
    if (!refreshCache) {
      const cached = await redis.get(cacheKey);

      if (cached) {
        return typeof cached === "string"
          ? JSON.parse(cached)
          : cached;
      }
    }

    // ---------- MONGODB ----------
    const comments = await arenaPostCommentModel.aggregate([
      {
        $match: {
          post_id: new mongoose.Types.ObjectId(postId),
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },

      {
        $unwind: "$user",
      },

      {
        $project: {
          _id: 1,
          post_id: 1,
          text: 1,
          likeCount: 1,
          createdAt: 1,

          user: {
            _id: "$user._id",
            username: "$user.username",
            name: "$user.name",
            verified: "$user.verified",
            profileImage: "$user.profileImage",
          },
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    // ---------- CACHE ----------
    await redis.set(
      cacheKey,
      JSON.stringify(comments),
      {
        ex: POST_COMMENTS_CACHE_SECONDS,
      }
    );

    return comments;
  } catch (error) {
    console.error("getPostComments:", error);
    throw error;
  }
};

export default postCommentArena;