import mongoose from "mongoose";
import redis from "../../config/redis.js";
import Follow from "../../models/follow.js";
import userProfile from "./userProfile.js";

const FOLLOWERS_CACHE_SECONDS = 60 * 5;

const userFollowers = async (
  userId,
  page = 1,
  limit = 20,
  refreshCache = false
) => {

  try {
    const skip = (page - 1) * limit;
    const cacheKey =
      `user_followers_${userId}_${page}_${limit}`;
   
    if (!refreshCache) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return typeof cached === "string"
          ? JSON.parse(cached)
          : cached;
      }
    }

    const relationships = await Follow.aggregate([

      {
        $match: {
          followingId:
            new mongoose.Types.ObjectId(userId)
        }
      },

      {
        $sort: {
          createdAt: -1
        }
      },

      {
        $skip: skip
      },

      {
        $limit: limit
      },

      {
        $project: {
          _id: 0,
          followerId: 1,
          createdAt: 1
        }
      }

    ]);


    const users = await Promise.all(
      relationships.map((relationship) =>
        userProfile(
          relationship.followerId,
          false
        )
      )
    );


    const followers = users
      .filter(Boolean)
      .map((user, index) => ({
        ...user,

        followedAt:
          relationships[index]?.createdAt,

        resultType: "user"
      }));


    const response = {
      users: followers,
      page,
      limit,
      hasMore:
        relationships.length === limit
    };


    await redis.set(
      cacheKey,
      JSON.stringify(response),
      {
        ex: FOLLOWERS_CACHE_SECONDS
      }
    );


    return response;

  } catch (error) {

    console.error(
      "getUserFollowers error:",
      error
    );

    throw error;
  }
};

export default userFollowers;