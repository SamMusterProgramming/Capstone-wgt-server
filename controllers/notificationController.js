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
        title: "New Activity",
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

                if(existantNotification.metadata.recent_voters.length <= 9) return ; 
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

// controller example
export const getNotifications = async (req, res) => {
  try {
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

  