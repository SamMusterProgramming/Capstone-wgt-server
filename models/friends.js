const mongoose = require('mongoose')


const friendSchema = new mongoose.Schema({
    
     user_id:{
        type:String,
        required:true
     },
     profile_img:{
        type:String
     },
     friends:[],
     email:{
        type:String,
        default:"no email"
     },
     name:{
      type:String,
      default:"no email"
     },
     friend_request_sent:[],
     createdAt: {
        type: Date,   
        default: Date.now
      }
   },
   { versionKey: false }           
 )
         
friendSchema.index({user_id:1});   

let friendModel = mongoose.model("friends",friendSchema);

module.exports = friendModel;