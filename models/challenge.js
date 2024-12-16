const mongoose = require('mongoose')
const validator = require('validator');


const challengeSchema = new mongoose.Schema({ 
    origin_id:{
       type:String,
       required : true ,
    },
    participants:[]
    ,
    like_count:{
        type:Number,
        min:[0]
    },
   
    video_url:{
        type:String,
        default:"/static/materials/avatar.avif"
    },
     desc:{
        type:String,
        required:false,
        default: "add description"
    },
    category:{
       type:String
    },  
     comments: [] // to store comment of a user in an array of object for the challenge 
},
 { timestamps: true, versionKey: false }
 )
// challengeSchema.index({origine_id:1});
// challengeSchema.index({user_id:1,id:1});

let challengeModel = mongoose.model("challenges",challengeSchema);

module.exports = challengeModel ;