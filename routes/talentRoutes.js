const express = require('express')
const {ObjectId} = require('mongodb')
const commentModel = require('../models/comments.js')
const talentModel = require('../models/talent.js')
// const favouriteModel = require('../models/favourites.js')
// const data = require('../utilities/data.js')
// const upload = require('../multer.js')
// const likeModel = require ('../models/likes.js')
// const mongoose = require('mongoose')
// const followerModel = require('../models/followers.js')
// const { findByIdAndUpdate } = require('../models/users.js')
// const notificationModel = require('../models/notifications.js')
// const friendModel = require('../models/friends.js')
// const viewerModel = require('../models/postViewers')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')


route = express.Router();


route.post('/creates',verifyJwt,async(req,res)=>{
     const roomTalentName =  req.body.name
     const regionName =  req.body.region
     const talent = await talentModel.findOne({name:roomTalentName , region:regionName})
     if(! talent) {
        const tal = new talentModel({
            name:roomTalentName,
            region : regionName,
            desc : req.body.desc
        })
       await tal.save()
       return res.json(tal)
     }
     return res.json(talent)
})


route.post('/uploads/:id',verifyJwt,async(req,res)=>{
    
    const newObjectId = new mongoose.Types.ObjectId();
    const _id = req.params.id
    const contestant = {
             _id: newObjectId,    
             user_id:req.body.user_id ,
             video_url:req.body.video_url,
             profile_img:req.body.profile_img,
             name:req.body.name,
             email:req.body.email,
             thumbNail_URL: req.body.thumbNail,
             createdAt: new Date()
            }  
    
    const newTalent = await talentModel.findByIdAndUpdate(
        _id,
        {
            $push: { contestants : contestant }
         },
         { new:true } 
    )
    if(!newTalent) return res.json({error:"challenge expired"}).status(404)
    

    res.json(newTalent)
})

route.get('/room/:id',verifyJwt, async(req,res)=>{
    const room_id = req.params.id;
    const talentRoom = await talentModel.findById(room_id)
    if(!talentRoom) return res.json("post expired")
    res.json(talentRoom).status(200)
   })

function  verifyJwt(req,res,next){
    const token = req.headers.authorization?.split(' ')[1]; // Assuming token is sent in Authorization header
    if (!token) return res.status(401).send({ message: 'No token provided' });
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) return res.status(403).send({ message: 'Failed to authenticate token' });
      req.user = decoded; // Store decoded user information in the request object
      next();
  });
  
}




module.exports = route; 