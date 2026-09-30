import mongoose from "mongoose";
import arenaModel from "../../models/arena.js";
import redis from "../../config/redis.js";


const USER_SPOTLIGHTS_CACHE_SECONDS = 60 * 5;

const userSpotlights = async (userId, refreshCache = false) => {
  try {
    const cacheKey = `user_spotlights_${userId}`;

    // --------------------------------------------------
    // CACHE
    // --------------------------------------------------

    if (!refreshCache) {
      const cached = await redis.get(cacheKey);

      if (cached) {
        return typeof cached === "string"
          ? JSON.parse(cached)
          : cached;
      }
    }

    // --------------------------------------------------
    // AGGREGATE USER ARENAS + THEIR SPOTLIGHT POSTS
    // --------------------------------------------------

    const spotlights = await arenaModel.aggregate([
      // ------------------------------------------------
      // 1. ONLY THIS USER'S ARENAS
      // ------------------------------------------------

      {
        $match: {
          owner_id: new mongoose.Types.ObjectId(userId),
        },
      },

      // ------------------------------------------------
      // 2. GET SPOTLIGHT POSTS FROM EACH ARENA
      // ------------------------------------------------

      {
        $lookup: {
          from: "arenaposts",

          let: {
            arenaId: "$_id",
          },

          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    "$arena_id",
                    "$$arenaId",
                  ],
                },

                // --------------------------------------
                // POST IS A SPOTLIGHT IF ANY ONE
                // OF THE THREE SPOTLIGHT TYPES IS TRUE
                // --------------------------------------

                $or: [
                  {
                    "globalSpotlight.spotlight": true,
                  },
                  {
                    "regionalSpotlight.spotlight": true,
                  },
                  {
                    "localSpotlight.spotlight": true,
                  },
                ],
              },
            },

            // ------------------------------------------
            // MOST RELEVANT SPOTLIGHT POSTS FIRST
            // ------------------------------------------

            {
              $sort: {
                spotlightScore: -1,
                createdAt: -1,
              },
            },

            // ------------------------------------------
            // KEEP THE COMPLETE POST DATA NEEDED BY UI
            // ------------------------------------------

            {
              $project: {
                _id: 1,
                arena_id: 1,
                owner_id: 1,
                caption: 1,
                media: 1,
                viewCount: 1,
                fireCount: 1,
                commentCount: 1,
                shareCount: 1,
                spotlightScore: 1,
                spotlightRegion: 1,
                spotlightCountry: 1,
                lastInteractionAt: 1,
                globalSpotlight: 1,
                regionalSpotlight: 1,
                localSpotlight: 1,
                createdAt: 1,
              },
            },
          ],

          as: "spotlightPosts",
        },
      },

      // ------------------------------------------------
      // 3. REMOVE ARENAS THAT HAVE NO SPOTLIGHT POSTS
      // ------------------------------------------------

      {
        $match: {
          "spotlightPosts.0": {
            $exists: true,
          },
        },
      },

      // ------------------------------------------------
      // 4. ONE DOCUMENT PER SPOTLIGHT POST
      // ------------------------------------------------

      {
        $unwind: "$spotlightPosts",
      },

      // ------------------------------------------------
      // 5. BUILD CLEAN SPOTLIGHT OBJECT
      // ------------------------------------------------

      {
        $project: {
            _id: "$spotlightPosts._id",
            arena_id: "$spotlightPosts.arena_id",
            owner_id: "$spotlightPosts.owner_id",
            caption: "$spotlightPosts.caption",
            media: "$spotlightPosts.media",
            viewCount: "$spotlightPosts.viewCount",
            fireCount: "$spotlightPosts.fireCount",
            commentCount: "$spotlightPosts.commentCount",
            shareCount: "$spotlightPosts.shareCount",
            spotlightScore: "$spotlightPosts.spotlightScore",
            spotlightRegion: "$spotlightPosts.spotlightRegion",
            spotlightCountry: "$spotlightPosts.spotlightCountry",
            lastInteractionAt: "$spotlightPosts.lastInteractionAt",
            globalSpotlight: "$spotlightPosts.globalSpotlight",
            regionalSpotlight: "$spotlightPosts.regionalSpotlight",
            localSpotlight: "$spotlightPosts.localSpotlight",
            createdAt: "$spotlightPosts.createdAt",

            arena: {
                _id: "$_id",
                arenaName: "$arenaName",
                talentType: "$talentType",
                region: "$region",
                biography: "$biography",
                description: "$description",
                coverImage: "$coverImage",
                profileImage: "$profileImage",
                followerCount: "$followerCount",
                starCount: "$starCount",
                postCount: "$postCount",
                viewCount: "$viewCount",
                verified: "$verified",
                owner_id: "$owner_id",
            },
        },
      },

      // ------------------------------------------------
      // 6. GLOBAL ORDER OF USER'S SPOTLIGHTS
      // ------------------------------------------------

      {
        $sort: {
          "post.spotlightScore": -1,
          "post.createdAt": -1,
        },
      },
    ]);

    // --------------------------------------------------
    // CACHE
    // --------------------------------------------------

    await redis.set(
      cacheKey,
      JSON.stringify(spotlights),
      {
        ex: USER_SPOTLIGHTS_CACHE_SECONDS,
      }
    );

    return spotlights;
  } catch (error) {
    console.error("userSpotlights error:", error);
    throw error;
  }
};

export default userSpotlights;