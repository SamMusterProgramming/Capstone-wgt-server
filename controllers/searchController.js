import arenaModel from "../models/arena.js";
import talentModel from "../models/talent.js";
import userModel from "../models/users.js";
import arenaById from "../redisCash/arenas/arenaById.js";




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
            { fullname: regex },
          ],
        })
          .select(
            "_id username fullname profileImage verified"
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