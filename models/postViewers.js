import  mongoose from 'mongoose'



const viewerSchema = new mongoose.Schema({
    post_id :{
        type:String,
        require:true,
    },
    user_id :{
        type:String,
        require:true,
    },
    viewers:[]
},
 { versionKey: false }
 )
viewerSchema.index({post_id:1})


let viewerModel = mongoose.model("viewers",viewerSchema);

export default viewerModel ;