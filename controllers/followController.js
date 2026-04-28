
import mongoose from "mongoose";
import followerModel from "../models/followers.js";

export const generateFollowers = async(user_id) => {
    const result = await followerModel.aggregate([
        {
            $match: { user_id: new mongoose.Types.ObjectId(user_id) }
        },
      
        // FRIENDS
        {
          $lookup: {
            from: "users",
            localField: "followers",
            foreignField: "_id",
            as: "followers"
          }
        },
      
        // FRIEND REQUEST SENT
        {
          $lookup: {
            from: "users",
            localField: "followings",
            foreignField: "_id",
            as: "followings"
          }
        },
      
        // OPTIONAL: clean output
      
      ]);
      return result[0];
}


export const followingRequest =  async (req, res) => {
    try {
      const userA = new mongoose.Types.ObjectId(req.params.id);   // follower
      const userB = new mongoose.Types.ObjectId(req.body.user_id); // target

      // prevent self-follow
      if (userA.equals(userB)) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      // Optional: check already following
      const exists = await followerModel.findOne({
        user_id: userA,
        followings: userB
      });

      if (exists) {
        return res.status(400).json({ message: "Already following" });
      }

      // 1. Add B to A.followings
      await followerModel.updateOne(
        { user_id: userA },
        {
          $addToSet: { followings: userB }
        }
      );

      // 2. Add A to B.followers
      await followerModel.updateOne(
        { user_id: userB },
        {
          $addToSet: { followers: userA }
        }
      );

      const fList = await generateFollowers(req.params.id)
      return res.status(200).json(fList);

    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  export const unfollowingRequest = async (req, res) => {
    try {
      const userA = new mongoose.Types.ObjectId(req.params.id);   // current user
      const userB = new mongoose.Types.ObjectId(req.body.user_id); // user to unfollow

      // prevent self-unfollow (optional safety)
      if (userA.equals(userB)) {
        return res.status(400).json({ message: "Invalid operation" });
      }

      // Optional: check if actually following
      const exists = await followerModel.findOne({
        user_id: userA,
        followings: userB
      });

      if (!exists) {
        return res.status(400).json({ message: "Not following this user" });
      }

      // 1. Remove B from A.followings
      await followerModel.updateOne(
        { user_id: userA },
        {
          $pull: { followings: userB }
        }
      );

      // 2. Remove A from B.followers
      await followerModel.updateOne(
        { user_id: userB },
        {
          $pull: { followers: userA }
        }
      );

      const fList = await generateFollowers(req.params.id)
      return res.status(200).json(fList);

    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  export const getFollowersList = async(req,res)=>{
    const user_id = req.params.id
    const result = await generateFollowers(user_id)
    return res.json(result).status(200)
  }