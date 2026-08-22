import arenaModel from "../models/arena.js";
import talentModel from "../models/talent.js";
import userModel from "../models/users.js";
import arenaById from "../redisCash/arenas/arenaById.js";

const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

const searchPeople = async ({
    query,
    skip,
    limit,
  }) => {
  
    const regex = new RegExp(
      escapeRegex(query),
      "i"
    );
  
    const filter = {
      $or: [
        { name: regex },
        { username: regex },
        { talent: regex },
        { city: regex },
      ],
    };
  
    const [results, total] =
      await Promise.all([
  
    userModel.find(filter)
          .select({
            password: 0,
          })
          .sort({
            name: 1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),
  
    userModel.countDocuments(filter),
  
      ]);
  
    return {
      results: results.map(user => ({
        ...user,
        resultType: "user",
      })),
  
      total,
  
      hasMore:
        skip + results.length < total,
    };
  };

const searchArenas = async ({
query,
skip,
limit,
}) => {

const regex = new RegExp(
    escapeRegex(query),
    "i"
);

const filter = {
    $or: [
    { arenaName: regex },
    { talentType: regex },
    { region: regex },
    ],
};

const [arenas, total] =
    await Promise.all([

     arenaModel.find(filter)
        .sort({
        createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

    arenaModel.countDocuments(filter),

    ]);
 const newArenas = await Promise.all(
        arenas.map((a) => arenaById(a._id, false))
      );
const results = newArenas.map(arena => ({
    ...arena,
    resultType: "arena",
}));

return {
    results,
    total,
    hasMore:
    skip + results.length < total,
};
};


const searchStages = async ({
query,
skip,
limit,
}) => {

const regex = new RegExp(
    escapeRegex(query),
    "i"
);

const filter = {
    $or: [
    { name: regex },
    { desc: regex },
    { region: regex },
    ],
};

const [stages, total] =
    await Promise.all([

    talentModel.find(filter)
        .sort({
        createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

    talentModel.countDocuments(filter),

    ]);

    const results = stages.map(stage => ({
        ...stage,
        resultType: "stage",
    }));

    return {
        results,
        total,
        hasMore:
        skip + results.length < total,
    };
};

export const searchSuggestions = async (req, res) => {
    try {
      const { q, limit = 5 } = req.query;
  
      if (!q || q.trim().length < 2) {
        return res.json({
          users: [],
          arenas: [],
          stages: [],
        });
      }
  
      const search = q.trim();
  
      const regex = new RegExp(search, "i");
  
      const [users, arenas, stages] = await Promise.all([
        userModel.find({
          $or: [
            { username: regex },
            { name: regex },
          ],
        })
          .select(
            "_id username email name profileImage coverImage "
          )
          .limit(Number(limit))
          .lean(),
  
        arenaModel.find({
          $or: [
            { arenaName: regex },
            { talentType: regex },
          ],
        })
          .select(
            "_id arenaName talentType region profileImage starCount followersCount performanceCount"
          )
          .limit(Number(limit))
          .lean(),
  
        talentModel.find({
          $or: [
            { name: regex },
            { talentType: regex },
          ],
        })
          .select(
            "_id name talentType region contestants queue eliminations"
          )
          .limit(Number(limit))
          .lean(),
      ]);

      const newArenas = await Promise.all(
        arenas.map((a) => arenaById(a._id, false))
      );

      return res.json({
        users,
        arenas:newArenas,
        stages,  
      });
  
    } catch (error) {
      console.error("Search suggestions error:", error);
  
      return res.status(500).json({
        message: "Failed to retrieve search suggestions",
      });
    }
  };

  export const deepSearch = async (req, res) => {
    try {
      const {
        q = "",
        type = "people",
        page = 1,
        limit = 20,
      } = req.query;
  
      const query = q.trim();
  
      if (!query || query.length < 2) {
        return res.status(200).json({
          results: [],
          page: 1,
          hasMore: false,
          total: 0,
        });
      }
  
      const allowedTypes = [
        "people",
        "arenas",
        "stages",
      ];
  
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({
          message: "Invalid search type",
        });
      }
  
      const pageNumber = Math.max(
        parseInt(page, 10) || 1,
        1
      );
  
      const limitNumber = Math.min(
        Math.max(parseInt(limit, 10) || 20, 1),
        50
      );
  
      const skip =
        (pageNumber - 1) * limitNumber;
  
      let result;
  
      switch (type) {
  
        case "people":
          result = await searchPeople({
            query,
            skip,
            limit: limitNumber,
          });
          break;
  
        case "arenas":
          result = await searchArenas({
            query,
            skip,
            limit: limitNumber,
          });
          break;
  
        case "stages":
          result = await searchStages({
            query,
            skip,
            limit: limitNumber,
          });
          break;
      }
  
      return res.status(200).json({
        results: result.results,
        page: pageNumber,
        limit: limitNumber,
        hasMore: result.hasMore,
        total: result.total,
      });
  
    } catch (error) {
  
      console.error(
        "Search error:",
        error
      );
  
      return res.status(500).json({
        message: "Search failed",
      });
    }
  };