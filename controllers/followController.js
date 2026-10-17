
import mongoose from "mongoose";
import followerModel from "../models/followers.js";
import userFollowers from "../redisCash/users/userFollowers.js";
import userFollowings from "../redisCash/users/userFollowings.js";
import FollowModal from "../models/follow.js";



export const followshipStatus = async (req, res) => {
  try {
    const { user_id, profile_id } = req.query;

    if (!user_id || !profile_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and profile_id are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(user_id) ||
      !mongoose.Types.ObjectId.isValid(profile_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or profile ID",
      });
    }

    // Is the visiting user following the profile owner?
    const isFollowing = await FollowModal.exists({
      followerId: user_id,
      followingId: profile_id,
    });

    return res.status(200).json({
      success: true,
      status: isFollowing ? "Following" : "Follow",
    });
  } catch (error) {
    console.error("followshipStatus error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve followship status",
    });
  }
};

export const followingRequest = async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;
    
    // Validate IDs
    if (
      !mongoose.isValidObjectId(senderId) ||
      !mongoose.isValidObjectId(receiverId)
    ) {
      return res.status(400).json({
        message: "Invalid senderId or receiverId",
      });
    }

    // Prevent self-follow
    if (senderId === receiverId) {
      return res.status(400).json({
        message: "Cannot follow yourself",
      });
    }
   
    // Create the follow relationship.
    // The unique compound index prevents duplicate relationships.

      await FollowModal.create({
        followerId: senderId,
        followingId: receiverId,
      }); 
   

      
    // Return the receiver's updated followers.
    const result = await userFollowings(
      senderId,
      1,
      20,
      true  
    );
    console.log(result)
    return res.status(200).json(result);
  } catch (err) {
    console.error("followingRequest error:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const removeFollower = async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;
    console.log(senderId)
    // Validate IDs
    if (
      !mongoose.isValidObjectId(senderId) ||
      !mongoose.isValidObjectId(receiverId)
    ) {
      return res.status(400).json({
        message: "Invalid senderId or receiverId",
      });
    }

    // Prevent self-removal
    if (senderId === receiverId) {
      return res.status(400).json({
        message: "Invalid operation",
      });
    }

    // receiverId follows senderId, so delete that relationship
    const result = await FollowModal.findOneAndDelete({
      followerId: receiverId,
      followingId: senderId,
    });

    if (!result) {
      return res.status(404).json({
        message: "This user is not following you",
      });
    }

    // Refresh the sender's followers list
    const fList = await userFollowers(
      senderId,
      1,
      20,
      true
    );

    return res.status(200).json(fList);
  } catch (err) {
    console.error("removeFollower error:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};


export const unfollowingRequest = async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;

    // Validate IDs
    if (
      !mongoose.isValidObjectId(senderId) ||
      !mongoose.isValidObjectId(receiverId)
    ) {
      return res.status(400).json({
        message: "Invalid senderId or receiverId",
      });
    }

    // Prevent self-unfollow
    if (senderId === receiverId) {
      return res.status(400).json({
        message: "Invalid operation",
      });
    }

    // Delete senderId's follow relationship with receiverId
    const result = await FollowModal.findOneAndDelete({
      followerId: senderId,
      followingId: receiverId,
    });

    if (!result) {
      return res.status(404).json({
        message: "Not following this user",
      });
    }

    // Refresh senderId's following list.
    // This assumes userFollowings returns the list of users senderId follows.
    const followingList = await userFollowings(
      senderId,
      1,
      20,
      true
    );

    return res.status(200).json(followingList);
  } catch (err) {
    console.error("unfollowingRequest error:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};


  export const getFollowers = async(req,res)=>{
    const user_id = req.params.id
    const results = await userFollowers(user_id, 1 , 20 , true)
    return res.json(results).status(200)
  }

  export const getFollowings = async(req,res)=>{
    const user_id = req.params.id
    const results = await userFollowings(user_id)
    return res.json(results).status(200)
  }