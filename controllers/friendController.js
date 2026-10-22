import mongoose, { Mongoose } from "mongoose";
import friendModel from "../models/friends.js";
import notificationModel from "../models/notifications.js";
import userModel from "../models/users.js";
import { emitNotification } from "./notificationController.js";
import friendshipModel from "../models/friendshipSchema.js";
import friendRequestModel from "../models/friendRequest.js";
import userFriends from "../redisCash/users/userFriends.js";
import userFriendRequestsReceived from "../redisCash/users/userFriendRequestsReceived.js";
import userFriendRequestsSent from "../redisCash/users/userFriendRequestsSent.js";






// ============================================================
// HELPERS
// ============================================================

const getSortedUserIds = (senderId, receiverId) => {
  const idA = senderId.toString();
  const idB = receiverId.toString();

  return idA < idB
    ? [senderId, receiverId]
    : [receiverId, senderId];
};



export const friendRequest = async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;

    // --------------------------------------------------------
    // 1. Prevent sending a request to yourself
    // --------------------------------------------------------

    if (senderId === receiverId) {
      return res.status(400).json({
        message: "You cannot send a friend request to yourself",
      });
    }

    // --------------------------------------------------------
    // 2. Make sure both users exist
    // --------------------------------------------------------

    const [sender, receiver] = await Promise.all([
      userModel.findById(senderId),
      userModel.findById(receiverId),
    ]);

    if (!sender) {
      return res.status(404).json({
        message: "Sender not found",
      });
    }

    if (!receiver) {
      return res.status(404).json({
        message: "Receiver not found",
      });
    }

    // --------------------------------------------------------
    // 3. Check if they are already friends
    // --------------------------------------------------------

    const [user1, user2] = getSortedUserIds(
      senderId,
      receiverId
    );

    const existingFriendship = await friendshipModel.findOne({
      user1,
      user2,
    });

    if (existingFriendship) {
      return res.status(400).json({
        message: "Users are already friends",
      });
    }

    // --------------------------------------------------------
    // 4. Check if sender already has a pending request
    // --------------------------------------------------------

    const existingOutgoingRequest =
      await friendRequestModel.findOne({
        sender: senderId,
        receiver: receiverId,
        status: "pending",
      });

    if (existingOutgoingRequest) {
      return res.status(400).json({
        message: "Request already exists",
      });
    }


    const existingIncomingRequest =
      await friendRequestModel.findOne({
        sender: receiverId,
        receiver: senderId,
        status: "pending",
      });

    if (existingIncomingRequest) {
      return res.status(400).json({
        message:
          "This user has already sent you a friend request",
        request_id: existingIncomingRequest._id,
      });
    }

    // --------------------------------------------------------
    // 6. Create request
    // --------------------------------------------------------

    const request = await friendRequestModel.create({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    });

    // --------------------------------------------------------
    // 7. Notification
    // --------------------------------------------------------

    await emitNotification(
      receiverId,
      senderId,
      "friends",
      "friend_request",
      {
        sender_id: senderId,
        sender_name: sender.name,
        sender_profile_img:
          sender.profileImage?.publicUrl || null,
        sender_cover_img:
          sender.coverImage?.publicUrl || null,
        sender_region: sender.country,
        request_id: request._id,
      }
    );

    const friendRequests = await userFriendRequestsSent(senderId,1,20,true);

    return res.status(200).json(friendRequests);

  } catch (err) {
    console.log("friendRequest error:", err);

    // Unique index protection
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Friend request already exists",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
};


// ============================================================
// ACCEPT FRIEND REQUEST
// ============================================================
export const acceptRequest = async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;
    const notificationId = null
    // --------------------------------------------------------
    // 1. Validate IDs
    // --------------------------------------------------------

    // if (
    //   !mongoose.Types.ObjectId.isValid(senderId) ||
    //   !mongoose.Types.ObjectId.isValid(receiverId)
    // ) {
    //   return res.status(400).json({
    //     message: "Invalid user ID",
    //   });
    // }


    // --------------------------------------------------------
    // 2. Prevent accepting yourself
    // --------------------------------------------------------

    if (senderId === receiverId) {
      return res.status(400).json({
        message: "Invalid friend request",
      });
    }

    // --------------------------------------------------------
    // 3. Verify request
    // --------------------------------------------------------

    const request = await friendRequestModel.findOne({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    });

    if (!request) {
      return res.status(400).json({
        message: "Request expired or invalid",
      });
    }

    // --------------------------------------------------------
    // 4. Get normalized friendship IDs
    // --------------------------------------------------------

    const [user1, user2] = getSortedUserIds(
      senderId,
      receiverId
    );

    // --------------------------------------------------------
    // 5. Create friendship
    // --------------------------------------------------------

    await friendshipModel.create({
      user1,
      user2,
    });

    // --------------------------------------------------------
    // 6. Increment both friend counters
    // --------------------------------------------------------

    await userModel.updateMany(
      {
        _id: {
          $in: [
            senderId,
            receiverId,
          ],
        },
      },
      {
        $inc: {
          friendCount: 1,
        },
      }
    );

    // --------------------------------------------------------
    // 7. Delete accepted friend request
    // --------------------------------------------------------

    await friendRequestModel.deleteOne({
      _id: request._id,
    });

    // --------------------------------------------------------
    // 8. Update original notification
    // --------------------------------------------------------

    if (notificationId) {
      await notificationModel.updateOne(
        {
          _id: notificationId,
        },
        {
          $set: {
            type: "friend_request_accepted_byou",
            is_read: true,
          },
        }
      );
    }

    // --------------------------------------------------------
    // 9. Get receiver information for notification
    // --------------------------------------------------------

    const receiver = await userModel.findById(
      receiverId
    );

    if (receiver) {
      await emitNotification(
        senderId,
        receiverId,
        "friends",
        "friend_request_accepted",
        {
          sender_name: receiver.name,
          sender_profile_img:
            receiver.profileImage?.publicUrl || null,
          sender_cover_img:
            receiver.coverImage?.publicUrl || null,
          sender_region: receiver.country,
        }
      );
    }

    // --------------------------------------------------------
    // 10. Get updated friend requests
    // --------------------------------------------------------

    const friendRequests = await userFriendRequestsReceived(receiverId,1,20,true);
    const friends =  await userFriends(receiverId,1,20,true)
    return res.status(200).json(
     { 
      requests: friendRequests,
      friends : friends
     }
    );

  } catch (err) {
    console.log(
      "acceptRequest error:",
      err
    );

    // Friendship already exists
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Users are already friends",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ============================================================
// DENY FRIEND REQUEST
// ============================================================

export const denyRequest = async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;

    // --------------------------------------------------------
    // Find pending request
    // --------------------------------------------------------

    const request = await friendRequestModel.findOne({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    });

    if (!request) {
      return res.status(400).json({
        message: "Request expired or invalid",
      });
    }


    await friendRequestModel.deleteOne({
      _id: request._id,
    });


    // --------------------------------------------------------
    // Remove notification
    // --------------------------------------------------------

    await notificationModel.deleteMany({
      type: "friend_request",
      sender_id: senderId,
      receiver_id: receiverId,
    });

    const friendRequests = await userFriendRequestsReceived(receiverId,1,20,true);


    return res.status(200).json(friendRequests);

  } catch (err) {
    console.log("denyRequest error:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};


// ============================================================
// CANCEL SENT FRIEND REQUEST
// ============================================================

export const cancelRequest = async (req, res) => {
  try {

    const { senderId, receiverId } = req.query;
    console.log(senderId)
    // --------------------------------------------------------
    // Find pending request
    // --------------------------------------------------------

    const request = await friendRequestModel.findOne({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    });

    if (!request) {
      return res.status(400).json({
        message: "Request expired or invalid",
      });
    }

    // --------------------------------------------------------
    // Mark as cancelled
    // --------------------------------------------------------

    await friendRequestModel.updateOne(
      {
        _id: request._id,
        status: "pending",
      },
      {
        $set: {
          status: "cancelled",
          respondedAt: new Date(),
        },
      }
    );

    // --------------------------------------------------------
    // Remove notification
    // --------------------------------------------------------

    await notificationModel.deleteMany({
      type: "friend_request",
      sender_id: senderId,
      receiver_id: receiverId,
    });

    const friendRequests = await userFriendRequestsSent(senderId,1,20,true);

    return res.status(200).json(friendRequests);

  } catch (err) {
    console.log("cancelRequest error:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};


// ============================================================
// UNFRIEND
// ============================================================


export const unfriendRequest = async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;


    if (!senderId || !receiverId || senderId === receiverId) {
      return res.status(400).json({
        message: "Invalid friendship",
      });
    }

    // Normalize IDs
    const [user1, user2] = getSortedUserIds(
      senderId,
      receiverId
    );

    // Verify friendship
    const friendship = await friendshipModel.findOne({
      user1,
      user2,
    });

    if (!friendship) {
      return res.status(400).json({
        message: "Users are not friends",
      });
    }

    // Delete friendship
    await friendshipModel.deleteOne({
      _id: friendship._id,
    });

    // Decrement both users' friend counts
    await userModel.updateMany(
      {
        _id: {
          $in: [senderId, receiverId],
        },
        friendCount: { $gt: 0 },
      },
      {
        $inc: { friendCount: -1 },
      }
    );

    // Return updated friends list
    const friends = await userFriends(receiverId, 1, 20, true);

    return res.status(200).json(friends);
  } catch (err) {
    console.log("unfriendRequest error:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};


export const getFriendList = async (req, res) => {
  const user_id = req.params.id;
  // await migrateFriends()
  const results = await userFriends(user_id,1,20,true);
  return res.json(results).status(200);

};

export const getFriendRequestsReceived = async (req, res) => {
  const user_id = req.params.id;
  const results = await userFriendRequestsReceived(user_id, 1 , 20 , true);
  return res.json(results).status(200);

};



export const getFriendshipStatus = async (req, res) => {
  try {
    const { user_id, profile_id } = req.query;

    // ------------------------------------------------
    // VALIDATE IDS
    // ------------------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(user_id) ||
      !mongoose.Types.ObjectId.isValid(profile_id)
    ) {
      return res.status(400).json({
        message: "Invalid user_id or profile_id",
      });
    }

    const senderId = new mongoose.Types.ObjectId(user_id);
    const receiverId = new mongoose.Types.ObjectId(profile_id);

    // ------------------------------------------------
    // SELF
    // ------------------------------------------------

    if (senderId.equals(receiverId)) {
      return res.status(200).json({
        status: "self",
      });
    }


    const friendship = await friendshipModel.findOne({
      $or: [
        {
          user1: senderId,
          user2: receiverId,
        },
        {
          user1: receiverId,
          user2: senderId,
        },
      ],
    }).lean();

    if (friendship) {
      return res.status(200).json({
        status: "friends",
      });
    }

    // ------------------------------------------------
    // USER A SENT REQUEST TO USER B
    // ------------------------------------------------

    const requestSent = await friendRequestModel.findOne({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    }).lean();

    if (requestSent) {
      return res.status(200).json({
        status: "pending",
        request_id: requestSent._id,
      });
    }

    // ------------------------------------------------
    // USER B SENT REQUEST TO USER A
    // ------------------------------------------------

    const requestReceived = await friendRequestModel.findOne({
      sender: receiverId,
      receiver: senderId,
      status: "pending",
    }).lean();

    if (requestReceived) {
      return res.status(200).json({
        status: "accept",
        request_id: requestReceived._id,
      });
    }

    return res.status(200).json({
      status: "add",
    });

  } catch (error) {
    console.error(
      "getFriendshipStatus error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

//old code here

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

export const friendRequest1 = 
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
      const sender = await userModel.findById(senderId)
      await emitNotification( 
        receiverId,
        senderId,
        'friends',
        "friend_request",
        {
          sender_id : senderId,
          sender_name: sender.name,
          sender_profile_img: sender.profileImage.publicUrl,
          sender_cover_img: sender.coverImage.publicUrl,
          sender_region : sender.country
        }
     )

      const fList = await generateFriends(req.params.id)
      return res.status(200).json(fList);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Server error" });
    }
    }



  export const acceptRequest1 = 
    async (req, res) => {
        try {
          const receiverId = new mongoose.Types.ObjectId(req.body.user_id); // accepts
          const senderId = new mongoose.Types.ObjectId(req.params.id);   // sent request
          const notificationId = new mongoose.Types.ObjectId(req.body._id); // accepts

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
            { _id: notificationId },
            {
              $set: {
                type: "friend_request_accepted_byou",
                is_read: true
              }
            }
          );

          const receiver  = await userModel
          .findById(receiverId)
          // 5. Create notification for receiver
          await emitNotification( 
            senderId,
            receiverId,
            'friends',
            "friend_request_accepted",
            {
              sender_name: receiver.name,
              sender_profile_img: receiver.profileImage.publicUrl,
              sender_cover_img: receiver.coverImage.publicUrl,
              sender_region : receiver.country
            }
          )
          const fList = await generateFriends(receiverId.toString())
          return res.status(200).json(fList);
        } catch (err) {
          console.log(err);
          return res.status(500).json({ message: "Server error" });
        }
    }


  export const cancelRequest1 = 
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
          type: "friend_request",
          $or: [
            {
              receiver_id: receiverId,
              sender_id: senderId,
            },
            {
              receiver_id: senderId,
              sender_id: receiverId,
            },
          ],
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

   
    export const unfriendRequest1 =  async (req, res) => {
        try {
          // const senderId = new mongoose.Types.ObjectId(req.params.id);   // current user
          // const receiverId = new mongoose.Types.ObjectId(req.body._id);    // friend to remove
          const { senderId, receiverId } = req.query;

          // Optional: check if they are actually friends
          const exists = await friendModel.findOne({
            user_id: senderId,
            friends: receiverId
          });
          if (!exists) {
            return res.status(400).json({ message: "Users are not friends" });
          }
          // Remove each other from friends list
          await friendModel.updateOne(
            { user_id: senderId },
            {
              $pull: { friends: receiverId }
            }
          );
          const updatedreceiverId = await friendModel.updateOne(
            { user_id: receiverId },
            {
              $pull: { friends: senderId }
            }
          );
          const fList = await generateFriends(req.body._id)
          return res.status(200).json(fList);
        } catch (err) {
          console.log(err);
          return res.status(500).json({ message: "Server error" });
        }
      }
    

  
    // export const getFriendList = async(req,res)=>{
    //     const user_id = req.params.id;     
    //     const result = await friendModel.aggregate([
    //         {
    //           $match: { user_id: user_id }
    //         },
          
    //         // FRIENDS
    //         {
    //           $lookup: {
    //             from: "users",
    //             localField: "friends",
    //             foreignField: "_id",
    //             as: "friends"
    //           }
    //         },
          
    //         // FRIEND REQUEST SENT
    //         {
    //           $lookup: {
    //             from: "users",
    //             localField: "friend_requests_sent",
    //             foreignField: "_id",
    //             as: "friend_requests_sent"
    //           }
    //         },
          
    //         // FRIEND REQUEST RECEIVED
    //         {
    //           $lookup: {
    //             from: "users",
    //             localField: "friend_requests_received",
    //             foreignField: "_id",
    //             as: "friend_requests_received"
    //           }
    //         },
          
    //         // OPTIONAL: clean output
    //         {
    //           $project: {
    //             user_id: 1,
    //             friends: {
    //               _id: 1,
    //               name: 1,
    //               profileImage: 1,
    //               coverImage: 1,
    //               city:1,
    //               state:1,
    //               country:1
    //             },
    //             friend_requests_sent: {
    //               _id: 1,
    //               name: 1,
    //               profileImage : 1,
    //               coverImage: 1
    //             },
    //             friend_requests_received: {
    //               _id: 1,
    //               name: 1,
    //               profileImage: 1,
    //               coverImage: 1
    //             }
    //           }
    //         }
    //       ]);
      
    //     // friendlist.friends = friends
    //     res.json(result[0]).status(200)
    //   }
      

    