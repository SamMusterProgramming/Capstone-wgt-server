import mongoose from "mongoose";
import redis from "../../config/redis.js";
import Follow from "../../models/follow.js";
import userProfile from "./userProfile.js";

const FOLLOWINGS_CACHE_SECONDS = 60 * 5;

const userFollowings = async (
  userId,
  page = 1,
  limit = 20,
  refreshCache = false
) => {

  try {

    const skip = (page - 1) * limit;
    const cacheKey = `user_followings_${userId}_${page}_${limit}`;
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
          followerId:
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
          followingId: 1,
          createdAt: 1
        }
      }
    ]);

    const users = await Promise.all(
      relationships.map((relationship) =>
        userProfile(
          relationship.followingId,
          false
        )
      )
    );

    const followings = users
      .filter(Boolean)
      .map((user, index) => ({
        ...user,
        followedAt:
          relationships[index]?.createdAt,
        resultType: "user"
      }));

    const response = {
      users: followings,
      page,
      limit,
      hasMore:
        relationships.length === limit
    };

    await redis.set(
      cacheKey,
      JSON.stringify(response),
      {
        ex: FOLLOWINGS_CACHE_SECONDS
      }
    );

    return response;

  } catch (error) {

    console.error(
      "getUserFollowings error:",
      error
    );

    throw error;
  }
};

export default userFollowings;