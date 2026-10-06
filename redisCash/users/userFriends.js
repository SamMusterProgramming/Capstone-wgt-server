import mongoose from "mongoose";
import redis from "../../config/redis.js";
import Friendship from "../../models/friendshipSchema.js";
import userProfile from "./userProfile.js";

const FRIENDS_CACHE_SECONDS = 60 * 5;

const userFriends = async (
  userId,
  page = 1,
  limit = 20,
  refreshCache = false
) => {

  try {
    const skip = (page - 1) * limit;
    const cacheKey =
      `user_friends_${userId}_${page}_${limit}`;

    if (!refreshCache) {

      const cached = await redis.get(cacheKey);

      if (cached) {

        return typeof cached === "string"
          ? JSON.parse(cached)
          : cached;

      }

    }

    const currentUserId =  new mongoose.Types.ObjectId(userId);
    const relationships = await Friendship.aggregate([

      {
        $match: {
          $or: [
            {
              user1: currentUserId
            },
            {
              user2: currentUserId
            }
          ]
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

          friendId: {
            $cond: [
              {
                $eq: [
                  "$user1",
                  currentUserId
                ]
              },
              "$user2",
              "$user1"
            ]
          },

          createdAt: 1
        }
      }

    ]);


    const users = await Promise.all(

      relationships.map((relationship) =>
        userProfile(
          relationship.friendId,
          false
        )
      )

    );


    const friends = users
      .filter(Boolean)
      .map((user, index) => ({
        ...user,

        friendsSince:
          relationships[index]?.createdAt,

        resultType: "user"
      }));


    const response = {
      users: friends,
      page,
      limit,
      hasMore:
        relationships.length === limit
    };


    await redis.set(
      cacheKey,
      JSON.stringify(response),
      {
        ex: FRIENDS_CACHE_SECONDS
      }
    );


    return response;

  } catch (error) {

    console.error(
      "getUserFriends error:",
      error
    );

    throw error;
  }
};

export default userFriends;