import notificationModel from "../models/notifications.js";

const emit = async ({
  receiverId,
  senderId,
  category,
  type,
  metadata = {},
}) => {
  try {
    const notification =
      await notificationModel.create({
        receiver_id: receiverId,
        sender_id: senderId,
        category,
        type,
        metadata,
      });
    return notification;
  } catch (err) {
    console.log(
      'NOTIFICATION SERVICE ERROR:',
      err
    );
  }
};
export default {
  emit,
};


