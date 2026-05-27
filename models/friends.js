import  mongoose from 'mongoose'


const friendSchema = new mongoose.Schema({
    
     user_id:{
        type:String,
        required:true
     },

     friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
     ],
     friend_requests_sent: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
     ],

     friend_requests_received: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
     ]
     ,
     createdAt: {
        type: Date,   
        default: Date.now   
      }
   },
   { versionKey: false }           
 )
         
friendSchema.index({user_id:1});   

let friendModel = mongoose.model("friends",friendSchema);

export default  friendModel;