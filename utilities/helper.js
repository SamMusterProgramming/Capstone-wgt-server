import followerModel from "../models/followers.js";
import friendModel from "../models/friends.js";
import { COUNTRY_REGIONS } from "./data.js";




export const ensureUserRelations = async (user) => {
    const findFollower = await followerModel.findOne({ user_id: user._id });
  
    if (!findFollower) {
      await followerModel.create({
        user_id: user._id,
        email: user.email,
        name: user.name,
        profile_img: user.profileImage?.publicUrl,
        cover_img: user.coverImage?.publicUrl,
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
        cover_img: user.coverImage?.publicUrl,
        friend_request_sent: [],
        friends: [],
      });
    }
  };


  export const getSpotlightRegion = (countryCode) => {

    const code = countryCode.toUpperCase();

    for (const [region, countries] of Object.entries(COUNTRY_REGIONS)) {

        if (countries.includes(code)) {
            return region;
        }

    }

    return null;
};