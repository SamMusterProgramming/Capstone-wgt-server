import mongoose from "mongoose";
import friendModel from "../models/friends.js";
import notificationModel from "../models/notifications.js";
import userModel from "../models/users.js";



export const generateFriends = async(user_id) => {
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
      return result[0];
}

export const friendRequest = 
  async (req, res) => {
    try {
      const senderId =   new mongoose.Types.ObjectId(req.params.id);
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
       

      console.log(sender)

      // 5. Create notification
      const notification = new notificationModel({
        receiver_id: receiverId,
        content: {
          sender_id: senderId,
          name: sender.name,
          profile_img: sender.profileImage.publicUrl,
          cover_img: sender.coverImage.publicUrl,
        },
        message: "sent you a friend request",
        type: "friend request",
        isRead: false
      });

      await notification.save();
      const fList = await generateFriends(req.params.id)
      console.log(fList)
      return res.status(200).json(fList);

    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Server error" });
    }
    }



    export const acceptRequest = 
    async (req, res) => {
        try {
          const receiverId = new mongoose.Types.ObjectId(req.body._id); // accepts
          const senderId = new mongoose.Types.ObjectId(req.params.id);   // sent request
    
          // 1. Check if request exists
          const exists = await friendModel.findOne({
            user_id: receiverId,
            friend_requests_received: senderId
          });
    
          if (!exists) {
            return res.status(400).json({ message: "Request expired or invalid" });
          }
    
          // 2. Update receiver (accepting user)
          await friendModel.findOneAndUpdate(
            { user_id: receiverId },
            {
              $pull: { friend_requests_received: senderId },
              $addToSet: { friends: senderId }
            }
          );
    
          // 3. Update sender
          const updatedSender = await friendModel.findOneAndUpdate(
            { user_id: senderId },
            {
              $pull: { friend_requests_sent: receiverId },
              $addToSet: { friends: receiverId }
            },
            { new: true }
          );
    
          // 4. Update existing notification (request → friends)
          await notificationModel.updateOne(
            {
              receiver_id:receiverId, 
              type: "friend request",
              "content.sender_id": senderId,
            },
            {
              $set: {
                type: "friends",
                message: "is now a friend, start sharing",
                isRead: true
              }
            }
          );

          const receiver  = await userModel
        .findById(receiverId)
    
          // 5. Create notification for receiver
          await notificationModel.create({
            receiver_id: senderId,
            content: {
              sender_id: receiverId,
              name: receiver.name,
              profile_img: receiver.profileImage.publicUrl,
              cover_img: receiver.coverImage.publicUrl,
            },
            message: "has accepted your friend request",
            type: "friends",
            isRead: false
          });
          const fList = await generateFriends(req.body._id)
          return res.status(200).json(fList);
    
        } catch (err) {
          console.log(err);
          return res.status(500).json({ message: "Server error" });
        }
    }


    export const cancelRequest = 
    async (req, res) => {
      try {
        const receiverId = new mongoose.Types.ObjectId(req.body._id);
        const senderId = new mongoose.Types.ObjectId(req.params.id);
  
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
              type: "friend request",
              "content.sender_id": receiverId
            },
            {
              receiver_id: receiverId,
              type: "friend request",
              "content.sender_id": senderId
            }
          ]
        });
        const fList = await generateFriends(req.params.id)
        return res.status(200).json(fList);
  
      } catch (err) {
        console.log(err);
        return res.status(500).json({
          message: "Server error"
        });
      }
    }



  
    export const getFriendList = async(req,res)=>{
        const user_id = req.params.id;
        console.log(user_id)
        // const friendlist = await friendModel.findOne({user_id:user_id})
      
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
      
        // friendlist.friends = friends
        res.json(result[0]).status(200)
      }
      


    