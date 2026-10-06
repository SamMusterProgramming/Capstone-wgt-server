import mongoose from "mongoose";
import redis from "../../config/redis.js";
// import FriendRequest from "../../models/friendRequestSchema.js";
import userProfile from "./userProfile.js";
import friendRequestModel from "../../models/friendRequest.js";

const FRIEND_REQUESTS_CACHE_SECONDS = 60 * 5;

const userFriendRequestsReceived = async (
  userId,
  page = 1,
  limit = 20,
  refreshCache = false
) => {
  try {
    const skip = (page - 1) * limit;

    const cacheKey =
      `user_friend_requests_received_${userId}_${page}_${limit}`;

    // ------------------------------------------------
    // REDIS CACHE
    // ------------------------------------------------

    if (!refreshCache) {
      const cached = await redis.get(cacheKey);

      if (cached) {
        return typeof cached === "string"
          ? JSON.parse(cached)
          : cached;
      }
    }

    const currentUserId =
      new mongoose.Types.ObjectId(userId);

    // ------------------------------------------------
    // GET RECEIVED REQUESTS
    // ------------------------------------------------

    const relationships =
      await friendRequestModel.aggregate([
        {
          $match: {
            receiver: currentUserId,
            status: "pending",
          },
        },

        {
          $sort: {
            createdAt: -1,
          },
        },

        {
          $skip: skip,
        },

        {
          $limit: limit,
        },

        {
          $project: {
            _id: 0,

            requestId: "$_id",

            senderId: "$sender",

            createdAt: 1,
          },
        },
      ]);

    // ------------------------------------------------
    // GENERATE USER PROFILES
    // ------------------------------------------------

    const requests = await Promise.all(
      relationships.map(async (relationship) => {
        const user = await userProfile(
          relationship.senderId,
          false
        );

        if (!user) {
          return null;
        }

        return {
          ...user,

          requestId:
            relationship.requestId,

          requestedAt:
            relationship.createdAt,

          resultType: "friend_request_received",
        };
      })
    );

    const users = requests.filter(Boolean);

    // ------------------------------------------------
    // RESPONSE
    // ------------------------------------------------

    const response = {
      users,
      page,
      limit,
      hasMore:
        relationships.length === limit,
    };

    // ------------------------------------------------
    // SAVE TO REDIS
    // ------------------------------------------------

    await redis.set(
      cacheKey,
      JSON.stringify(response),
      {
        ex: FRIEND_REQUESTS_CACHE_SECONDS,
      }
    );

    return response;

  } catch (error) {
    console.error(
      "userFriendRequestsReceived error:",
      error
    );

    throw error;
  }
};

export default userFriendRequestsReceived;