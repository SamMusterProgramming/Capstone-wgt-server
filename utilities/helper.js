import followerModel from "../models/followers.js";
import friendModel from "../models/friends.js";




export const ensureUserRelations = async (user) => {
    const findFollower = await followerModel.findOne({ user_id: user._id });
  
    if (!findFollower) {
      await followerModel.create({
        user_id: user._id,
        email: user.email,
        name: user.name,
        profile_img: user.profileImage?.publicUrl,
        followers: [],
        followings: [],
      });
    }
  
    const findFriend = await friendModel.findOne({ user_id: user._id });
  
    if (!findFriend) {
      await friendModel.create({
        user_id: user._id,
        email: user.email,
        name: user.name,
        profile_img: user.profileImage?.publicUrl,
        friend_request_sent: [],
        friends: [],
      });
    }
  };