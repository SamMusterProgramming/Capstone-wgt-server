const mongoose = require('mongoose')


const friendSchema = new mongoose.Schema({
    
     receiver_id:{
        type:String,
        required:true
     },
     profile_img:{
        type:String
     },
     friends:[],
     user_email:{
        type:String,
        default:"no email"
     },
     user_name:{
        type:String,
        default:"no name"
     },
     friends_count:{
        type:Number,
        default:0
     },
     friend_request_send:[],
     friend_request_received:[],
     createdAt: {
        type: Date,   
        default: Date.now
      }
   },
   { versionKey: false }           
 )
         
friendSchema.index({receiver_id:1});   

let friendModel = mongoose.model("friends",friendSchema);

module.exports = friendModel;