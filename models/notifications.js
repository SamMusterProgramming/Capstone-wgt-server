const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  receiver_id: {
    type: String,
    required: true
  },
  content: {},
  message:{
    type:String
  },
  type: {
    type: String,
    enum: ['like', 'comment', 'follower','friends', "friend request",'other'], 
    default: 'other'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
},
   { versionKey: false } 
);

notificationSchema.index({receiver_id:1});   
let notificationModel = mongoose.model('Notification', notificationSchema);

module.exports = notificationModel