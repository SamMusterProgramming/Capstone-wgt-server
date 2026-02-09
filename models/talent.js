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
    // waiting_list:[]
    // ,
    voters:[],
    editions:[],
    // round:{
    //     type: Number,
    // },
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
    // audience:{
    //    type:String,
    //    default: "open"
    // },
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