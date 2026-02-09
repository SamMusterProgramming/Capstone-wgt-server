import  mongoose from 'mongoose'



const followerSchema = new mongoose.Schema({
    
     user_id:{
        type:String,
        required:true
     },
     followers:[],
     followings:[],
     email:{
        type:String,
        default:"no name"
     },
     name:{
      type:String,
      default:"no name"
     },
     profile_img:{
        type:String
     }
    
   },
    { timestamps: true , versionKey: false }
 )
     
followerSchema.index({user_id:1});   
// followerSchema.index({user_id:1,follower_id:1});

let followerModel = mongoose.model("followers",followerSchema);

export default followerModel;