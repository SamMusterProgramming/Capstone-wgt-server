const mongoose = require('mongoose')
const validator = require('validator');


const likeSchema = new mongoose.Schema({ 
    user_id:{// who will like the post
       type:String,
       required: true   
    },
    post_id:{ // the owner of the post/video challenge
       type:String,
       required:true,
    },
    like:{
        type:Boolean,
        default:false
    },
    vote:{
        type:Boolean,   
        default:false
    },
     comments: [] // to store comment of a user in an array of object for the like 
},
 { timestamps: true, versionKey: false }
 )
likeSchema.index({user_id:1});
likeSchema.index({post_id:1});
likeSchema.index({user_id:1,post_id:1});

let likeModel = mongoose.model("like",likeSchema);

module.exports = likeModel ;