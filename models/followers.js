const mongoose = require('mongoose')


const followerSchema = new mongoose.Schema({
    
     user_id:{
        type:String,
        required:true
     },
     followers:[],
     followings:[],
     user_email:{
        type:String,
        default:"no email"
     },
     followers_count:{
        type:Number,
        default:0
     }
   },
    { timestamps: true , versionKey: false }
 )
     
followerSchema.index({user_id:1});   
// followerSchema.index({user_id:1,follower_id:1});

let followerModel = mongoose.model("followers",followerSchema);

module.exports = followerModel;