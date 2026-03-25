import  mongoose from 'mongoose'


const talentSchema = new mongoose.Schema({ 
    name:{
        type:String,
        default:"unkown"
    },
    contestants:[]
    ,
    eliminations:[]
    ,
    queue:[]
    ,

    voters:[],
    editions:[],
   
    desc:{
        type:String,
        required:false,
        default: "add description"
    },
    region:{
        type:String
    },
    MAXCONTESTANTS: {
        type: Number,
        default: 22, 
      },
    invited_friends:[],
 
    thumbNail_URL : {
        type:String
    },
    comments: [] // to store comment of a user in an array of object for the challenge 
},
 { timestamps: true, versionKey: false }
 )
talentSchema.index({region:1 , name:1});

let talentModel = mongoose.model("talents",talentSchema);

export default talentModel ;    