import redis from "../../config/redis.js";
import favouriteModel from "../../models/favourites.js";


const FAVOURITES_CACHE_SECONDS =
  60 * 5;

export const favouriteStages =
  async (
    userId,
    refreshCache = false
  ) => {

    const cacheKey =
      `favourites_${userId}`;
    try {

      // REDIS
      if (!refreshCache) {
        const cached =
          await redis.get(cacheKey);
        if (cached) {
          return typeof cached ===
            "string"
            ? JSON.parse(cached)
            : cached;
        }
      }

      const result =
        await favouriteModel.aggregate([
          {
            $match: {
              user_id: userId,
            },
          },

          {
            $lookup: {
              from: "talents",
              localField:
                "favourites",
              foreignField: "_id",
              as: "favourites",
            },
          },

          {
            $project: {
              _id: 0,
              favourites: 1,
            },
          },
        ]);

      const favourites =
        result[0]?.favourites ||
        [];

      await redis.set(
        cacheKey,
        JSON.stringify(
          favourites
        ),
        {
          ex:
            FAVOURITES_CACHE_SECONDS,
        }
      );

      return favourites;

    } catch (error) {

      console.error(
        "aggregateFavourites error:",
        error
      );

      throw error;
    }
  };

  export default favouriteStages;