import redis from "../config/redis.js";
import notificationModel from "../models/notifications.js";
import { buildPushNotification, getReceiverNotifications,  sendPushNotification } from "../pipeLine/getReceiverNotifications.js";
import notificationService from "../service/notificationService.js";
import { notificationViewBuilders } from "../templates/notificationViewBuilders.js";
import { getUserProfile } from "./userController.js";

export const broadcastNotification = async (
                                    receivers = [],
                                    senderId,
                                    category,
                                    type,
                                    metadata = {},
                                    ) => {
  try {
    const uniqueReceivers =
        [...new Set(receivers)];
        if (!uniqueReceivers.length) return;
        for (const receiverId of uniqueReceivers) {
        const notification = await notificationService.emit({
            receiverId,
            senderId,
            category,
            type,
            metadata,
        });
        const pushNotification = await  buildPushNotification(notification)
        const receiver = await getUserProfile(receiverId)
        await sendPushNotification(receiver.expoPushToken, {
          title: "New Activity",
          body: pushNotification.presentation.text,
          data: {...pushNotification.metadata ,
                type : notification.type,
                notification_id:notification._id
                }
        });
        }
  } catch (err) {
    console.log(
      'BROADCAST NOTIFICATION ERROR:',
      err
    );
  }
};

export const emitNotification = async (
                                        receiverId,
                                        senderId = null,
                                        category,
                                        type,
                                        metadata = {},
                                        ) => {
    try {
      const notification = await notificationService.emit({
        receiverId,
        senderId,
        category,
        type,
        metadata,
      });
      //try only
      const pushNotification = await  buildPushNotification(notification)
      const receiver = await getUserProfile(receiverId)
      await sendPushNotification(receiver.expoPushToken, {
        title: category,
        body: pushNotification.presentation.text,
        data: {
               ...pushNotification.metadata , 
               type : notification.type , 
               notification_id:notification._id,
              }
      });
      return notification;
    } catch (err) {
      console.log('EMIT NOTIFICATION ERROR:', err);
    }
};

export const emitVotesNotification = async (
                                            receiverId,
                                            senderId = null,
                                            category,
                                            type,
                                            metadata = {},
                                            ) => {
            try {
                let existantNotification = await notificationModel.findOne({
                    receiver_id: receiverId,
                    category:"competition" ,
                    type: "vote_received",
                    is_read: false,
                    "metadata.stage_id": metadata.stage_id
                    });
                if(!existantNotification)
                    existantNotification = await notificationService.emit({
                                                        receiverId,
                                                        senderId,
                                                        category,
                                                        type,
                                                        metadata,
                                                        });
                else {
                    if(!existantNotification.metadata.recent_voters.find(v => v.voter_id == metadata.recent_voters[0].voter_id)){
                    existantNotification.metadata.total_votes += 1;  
                    existantNotification.metadata.recent_voters.unshift(metadata.recent_voters[0]);
                    existantNotification.markModified("metadata");
                    await existantNotification.save()
                    }
                }     
                if(existantNotification.metadata.recent_voters.length % 9 !== 0) return ; 
                const pushNotification = await  buildPushNotification(existantNotification)
                const receiver = await getUserProfile(receiverId)
                await sendPushNotification(receiver.expoPushToken, {
                    title: "New Activity",
                    body: pushNotification.presentation.text,
                    data: {
                    ...pushNotification.metadata , 
                    type : existantNotification.type , 
                    }
                });
                return existantNotification;
            } catch (err) {
                console.log('EMIT NOTIFICATION ERROR:', err);
            }
};

export const emitFiresNotification = async (
        receiverId,
        senderId = null,
        category,
        type,
        metadata = {},
          ) => {
  try {
  let existantNotification = await notificationModel.findOne({
      receiver_id: receiverId,
      category:"arena" ,
      type: "fire_received",
      // is_read: false,
      "metadata.post_id": metadata.post_id
  });
  if(!existantNotification)
      existantNotification = await notificationService.emit({
                receiverId,
                senderId,
                category,
                type,
                metadata,
                });
  else {
    // console.log(existantNotification)
    if(!existantNotification.metadata.recent_firers.find(f => f.firer_id == metadata.recent_firers[0].firer_id)){
        existantNotification.metadata.total_fires += 1;  
        existantNotification.metadata.recent_firers.unshift(metadata.recent_firers[0]);
        existantNotification.is_read=false;
        existantNotification.markModified("metadata");
        await existantNotification.save()
    }
  }     
  if(existantNotification.metadata.recent_firers.length % 5 !== 0) return ; 
  const pushNotification = await  buildPushNotification(existantNotification)
  const receiver = await getUserProfile(receiverId)
  await sendPushNotification(receiver.expoPushToken, {
  title: "New Activity",
  body: pushNotification.presentation.text,
  data: {
  ...pushNotification.metadata , 
  type : existantNotification.type , 
  }
  });
  return existantNotification;
  } catch (err) {
   console.log('EMIT NOTIFICATION ERROR:', err);
  }
  };



export const emitCommentsNotification = async (
    receiverId,
    senderId = null,
    category,
    type,
    metadata = {},
      ) => {
try {
let existantNotification = await notificationModel.findOne({
  receiver_id: receiverId,
  category:"arena" ,
  type: "comment_received",
  // is_read: false,
  "metadata.post_id": metadata.post_id
});
if(!existantNotification)
  existantNotification = await notificationService.emit({
            receiverId,
            senderId,
            category,
            type,
            metadata,
            });
else {
// console.log(existantNotification)
if(!existantNotification.metadata.recent_commentors.find(f => f.commentor_id == metadata.recent_commentors[0].commentor_id)){
    existantNotification.metadata.total_commentors += 1;  
    existantNotification.metadata.recent_commentors.unshift(metadata.recent_commentors[0]);
    existantNotification.is_read=false;
    existantNotification.markModified("metadata");
    await existantNotification.save()
}
}     
if(existantNotification.metadata.recent_commentors.length % 5 !== 0) return ; 
const pushNotification = await  buildPushNotification(existantNotification)
const receiver = await getUserProfile(receiverId)
console.log(receiver.expoPushToken)
await sendPushNotification(receiver.expoPushToken, {
title: "New Activity",
body: pushNotification.presentation.text,
data: {
...pushNotification.metadata , 
type : existantNotification.type , 
}
});
return existantNotification;
} catch (err) {
console.log('EMIT NOTIFICATION ERROR:', err);
}
};

export const emitFollowersNotification = async (
          receiverId,
          senderId = null,
          category,
          type,
          metadata = {},
            ) => {
  try {
    let existantNotification = await notificationModel.findOne({
    receiver_id: receiverId,
    category:"arena" ,
    type: "follow_arena",
    // is_read: false,
    "metadata.arena_id": metadata.arena_id
    });
    if(!existantNotification)
    existantNotification = await notificationService.emit({
              receiverId,
              senderId,
              category,
              type,
              metadata,
              });
    else {

    if(!existantNotification.metadata.recent_followers.find(f => f.follower_id == metadata.recent_followers[0].follower_id)){
      existantNotification.metadata.total_followers += 1;  
      existantNotification.metadata.recent_followers.unshift(metadata.recent_followers[0]);
      existantNotification.is_read=false;
      existantNotification.markModified("metadata");
      await existantNotification.save()
    }
    }     
    if(existantNotification.metadata.recent_followers.length % 5 !== 0) return ; 
    const pushNotification = await  buildPushNotification(existantNotification)
    const receiver = await getUserProfile(receiverId)
    console.log(receiver.expoPushToken)
    await sendPushNotification(receiver.expoPushToken, {
    title: "New Activity",
    body: pushNotification.presentation.text,
    data: {
    ...pushNotification.metadata , 
    type : existantNotification.type , 
    }
    });
    return existantNotification;
  } catch (err) {
    console.log('EMIT NOTIFICATION ERROR:', err);
  }
};

export const emitStarrersNotification = async (
          receiverId,
          senderId = null,
          category,
          type,
          metadata = {},
            ) => {
  try {
    let existantNotification = await notificationModel.findOne({
      receiver_id: receiverId,
      category:"arena" ,
      type: "star_arena",
      // is_read: false,
      "metadata.arena_id": metadata.arena_id
    });
    if(!existantNotification)
    existantNotification = await notificationService.emit({
          receiverId,
          senderId,
          category,
          type,
          metadata,
          });
    else {
          if(!existantNotification.metadata.recent_starrers.find(f => f.starrer_id == metadata.recent_starrers[0].starrer_id)){
              existantNotification.metadata.total_starrers += 1;  
              existantNotification.metadata.recent_starrers.unshift(metadata.recent_starrers[0]);
              existantNotification.is_read=false;
              existantNotification.markModified("metadata");
              await existantNotification.save()
          }
    }     
    if(existantNotification.metadata.recent_starrers.length % 5 !== 0) return ; 
    const pushNotification = await  buildPushNotification(existantNotification)
    const receiver = await getUserProfile(receiverId)
    await sendPushNotification(receiver.expoPushToken, {
    title: "New Activity",
    body: pushNotification.presentation.text,
    data: {
    ...pushNotification.metadata , 
    type : existantNotification.type , 
    }
    });
    return existantNotification;
  } catch (err) {
  console.log('EMIT NOTIFICATION ERROR:', err);
  }
};

export const broadcastSpotlightPerformanceNotifications = async( 
  leaderboard , spotightType = ""
 )=>{
  for (const p of leaderboard) {
    const existingNotification = await notificationModel.findOne({
      receiver_id: p.owner._id.toString(),
      type: "spotlight_featured",
      "metadata.post_id": p._id,
    });
  
    if (!existingNotification) {
      await emitNotification(
        p.owner._id.toString(),
        null,
        "arena",
        "spotlight_featured",
        {
          arena_id: p.arena._id,
          arena_name: p.arena.arenaName,
          arena_region: p.arena.region,
          post_id: p._id,
          type: [spotightType],
        }
      );
  
      continue;
    }
  
    if (
      existingNotification.metadata.type.includes(spotightType)
    ) {
      continue;
    }
  
    await notificationModel.updateOne(
      { _id: existingNotification._id },
      {
        $addToSet: {
          "metadata.type": spotightType,
        },
      }
    );

  }
}

// controller example
export const getNotifications = async (req, res) => {
  try {
    console.log(req.user._id)
    const notifications =
      await getReceiverNotifications({
        receiverId:req.user._id,
        limit:
          Number(req.query.limit) || 20,
        page:
          Number(req.query.page) || 1,
      });
    return res.status(200).json(
      notifications
    );
  } catch (err) {
    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch notifications",
    });
  }
};

  