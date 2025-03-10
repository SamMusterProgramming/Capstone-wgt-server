const mongoose = require('mongoose')


const favouriteSchema = new mongoose.Schema({
    
     user_id:{
        type:String,
        required:true
     },
     favourites:[]
    //  challenge_id:{
    //     type:String,
    //     required:true
    //  },
   },
    { timestamps: true , versionKey: false }
 )
     
favouriteSchema.index({user_id:1});   
// followerSchema.index({user_id:1,follower_id:1});

let favouriteModel= mongoose.model("favourites",favouriteSchema);

module.exports = favouriteModel;