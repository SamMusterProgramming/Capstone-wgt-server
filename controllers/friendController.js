import mongoose from "mongoose";
import friendModel from "../models/friends.js";
import notificationModel from "../models/notifications.js";
import userModel from "../models/users.js";



export const friendRequest = 
  async (req, res) => {
    try {
      const senderId = new mongoose.Types.ObjectId(req.params.id);
      const receiverId = new mongoose.Types.ObjectId(req.body._id);

      // 1. Prevent duplicate request
      const alreadySent = await friendModel.findOne({
        user_id: senderId,
        friend_requests_sent: receiverId
      });

      if (alreadySent) {
        return res.status(400).json({ message: "Request already exists" });
      }

      // 2. Update receiver (incoming request)
      const receiver = await friendModel.findOneAndUpdate(
        { user_id: receiverId },
        {
          $addToSet: {
            friend_requests_received: senderId
          }
        },
        { new: true }
      );

      // 3. Update sender (outgoing request)
      await friendModel.findOneAndUpdate(
        { user_id: senderId },
        {
          $addToSet: {
            friend_requests_sent: receiverId
          }
        }
      );

      if (!receiver) {
        return res.status(404).json({ message: "Receiver not found" });
      }

      // 4. Get sender info for notification (fresh from users collection)
      const sender = await userModel
        .findById(senderId)
        .select("name profile_img cover_img email");

      // 5. Create notification
      const notification = new notificationModel({
        receiver_id: receiverId,
        content: {
          sender_id: senderId,
          name: sender.name,
          profile_img: sender.profile_img,
          cover_img: sender.cover_img,
          email: sender.email
        },
        message: "sent you a friend request",
        type: "friend_request",
        isRead: false
      });

      await notification.save();

      return res.status(200).json({
        message: "Friend request sent",
        receiver
      });

    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Server error" });
    }
  }



   

    export const cancelRequest = 
    async (req, res) => {
      try {
        const receiverId = new mongoose.Types.ObjectId(req.params.id);
        const senderId = new mongoose.Types.ObjectId(req.body._id);
  
        // 1. Remove from sender outgoing requests
        await friendModel.findOneAndUpdate(
          { user_id: senderId },
          {
            $pull: {
              friend_requests_sent: receiverId
            }
          }
        );
  
        // 2. Remove from receiver incoming requests
        await friendModel.findOneAndUpdate(
          { user_id: receiverId },
          {
            $pull: {
              friend_requests_received: senderId
            }
          }
        );
  
        // 3. Delete notifications (both directions safety cleanup)
        await notificationModel.deleteMany({
          $or: [
            {
              receiver_id: senderId,
              type: "friend_request",
              "content.sender_id": receiverId
            },
            {
              receiver_id: receiverId,
              type: "friend_request",
              "content.sender_id": senderId
            }
          ]
        });
  
        return res.status(200).json({
          message: "Friend request cancelled"
        });
  
      } catch (err) {
        console.log(err);
        return res.status(500).json({
          message: "Server error"
        });
      }
    }
  
    export const getFriendList = async(req,res)=>{
        const user_id = req.params.id;
        // const friendlist = await friendModel.findOne({user_id:user_id})
        console.log(user_id)
        const result = await friendModel.aggregate([
            {
              $match: { user_id: user_id }
            },
          
            // FRIENDS
            {
              $lookup: {
                from: "users",
                localField: "friends",
                foreignField: "_id",
                as: "friends"
              }
            },
          
            // FRIEND REQUEST SENT
            {
              $lookup: {
                from: "users",
                localField: "friend_requests_sent",
                foreignField: "_id",
                as: "friend_requests_sent"
              }
            },
          
            // FRIEND REQUEST RECEIVED
            {
              $lookup: {
                from: "users",
                localField: "friend_requests_received",
                foreignField: "_id",
                as: "friend_requests_received"
              }
            },
          
            // OPTIONAL: clean output
            {
              $project: {
                user_id: 1,
                friends: {
                  _id: 1,
                  name: 1,
                  profileImage: 1,
                  coverImage: 1
                },
                friend_requests_sent: {
                  _id: 1,
                  name: 1,
                  profileImage : 1,
                  coverImage: 1
                },
                friend_requests_received: {
                  _id: 1,
                  name: 1,
                  profileImage: 1,
                  coverImage: 1
                }
              }
            }
          ]);
      
        console.log(result[0])
        // friendlist.friends = friends
        res.json(result[0]).status(200)
      
      }
      


    