const mongoose = require('mongoose')
const validator = require('validator');


const postSchema = new mongoose.Schema({ 
    id:{
       type:Number,
       required : true ,
       unique : true 
    },
    user_id:{
       type:Number,
       required: true   
    },
     image_url:{
        type:String,
        default:"/static/materials/avatar.avif"
    },
     desc:{
        type:String,
        required:false,
        default: "add description"
    },
     comments: [] // to store comment of a user in an array of object for the post 
},
 { timestamps: true, versionKey: false }
 )
postSchema.index({user_id:1});
postSchema.index({id:1});
postSchema.index({user_id:1,id:1});

let postModel = mongoose.model("posts",postSchema);

module.exports = postModel ;