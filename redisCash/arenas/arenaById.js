import mongoose from "mongoose";
import redis from "../../config/redis.js";
import arenaModel from "../../models/arena.js";

const ARENA_BY_ID_CACHE_SECONDS = 60 * 5;

const arenaById = async (
  arenaId,
  refreshCache = false
) => {
  try {
    const cacheKey = `arena_${arenaId}`;

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
    const arena = await arenaModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(arenaId),
        },
      },

      {
        $lookup: {
          from: "arenaposts",
          let: {
            postIds: "$posts",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$postIds"],
                },
              },
            },

            {
              $project: {
                _id: 1,
                owner_id: 1,
                caption: 1,
                media: 1,
                spotlight: 1,
                spotlightScore: 1,
                fireCount: 1,
                commentCount: 1,
                shareCount: 1,
                viewCount: 1,
                createdAt: 1,
              },
            },

            {
              $sort: {
                createdAt: -1,
              },
            },
          ],
          as: "posts",
        },
      },

      {
        $project: {
          _id: 1,
          owner_id: 1,
          arenaName: 1,
          talentType: 1,
          biography: 1,
          description: 1,
          region: 1,
          coverImage: 1,
          profileImage: 1,

          followerCount: 1,
          starCount: 1,
          postCount: 1,
          viewCount: 1,

          verified: 1,
          createdAt: 1,

          posts: 1,
        },
      },
    ]);

    const result = arena[0] || null;

    // ---------- CACHE ----------
    if (result) {
      await redis.set(
        cacheKey,
        JSON.stringify(result),
        {
          ex: ARENA_BY_ID_CACHE_SECONDS,
        }
      );
    }

    return result;
  } catch (error) {
    console.error("arenaById error:", error);
    throw error;
  }
};

export default arenaById;