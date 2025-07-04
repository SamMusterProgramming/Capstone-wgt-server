const express = require('express')
const {ObjectId} = require('mongodb')
const commentModel = require('../models/comments.js')
const talentModel = require('../models/talent.js')
const talentPostDataModel  = require('../models/talentPostData.js')

const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const friendModel = require('../models/friends.js')
const notificationModel = require('../models/notifications.js')


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
     let newT = {
        _id:talent._id,
        name:talent.name,
        region : talent.region,
        desc : talent.desc,
        contestants:[]
     }
     if(talent.contestants.length > 0){
        talent.contestants.map(async(contestant,index) => {
            const pData = await talentPostDataModel.findOne({post_id:contestant._id})
            if (pData) newT.contestants.push({...contestant,votes:pData.votes.length})
            else newT.contestants.push({...contestant,votes:0 })
            if(newT.contestants.length == talent.contestants.length){
                console.log(newT)
                newT.contestants.sort((a, b) => b.votes - a.votes)
                return  res.json(newT)
            }     
              
        })
     }else  return res.json(talent)   
})
//******************************** post likes, votes, comments */

route.get('/post/:id',verifyJwt,async(req,res)=>{
    const post_id =  req.params.id
    const talentPost = await talentPostDataModel.findOne(
        {post_id:post_id}
        )
     if(!talentPost) 
      {
        return res.json("expired")   
      }
    return res.json(talentPost)
})

route.post('/likes/:id',verifyJwt,async(req,res)=>{
    
    const post_id =  req.params.id
    const owner_id = req.body.owner_id
    const like = {
       liker_id : req.body.liker_id
    }
    const talentPost = await talentPostDataModel.findOne(
        {post_id:post_id}
        )
    if(! talentPost) {
      
        return res.json("expired")
    }
    
    let updateQuery;

    const userLiked = talentPost.likes.find(like => like.liker_id == req.body.liker_id);
    if (userLiked) {
        updateQuery = { $pull: { likes: like } };
      } else {
        updateQuery = { $addToSet: { likes: like } }; // $addToSet ensures unique entries
      }
    const updatedPost = await talentPostDataModel.findOneAndUpdate(
        {post_id:post_id},
         updateQuery,
        { new: true } 
      );
    return res.json(updatedPost)
})

route.post('/flags/:id',verifyJwt,async(req,res)=>{
    const post_id =  req.params.id
    const owner_id = req.body.owner_id
    const flag = {
       flagger_id : req.body.flagger_id
    }
    const talentPost = await talentPostDataModel.findOne(
        {post_id:post_id}
        )
    if(! talentPost) { 
        return res.json("expired")
    }
    
    let updateQuery;

    const userFlagged = talentPost.flags.find(flag => flag.flagger_id == req.body.flagger_id);
    if (userFlagged) {
        updateQuery = { $pull: { flags: flag } };
      } else {
        updateQuery = { $addToSet: { flags: flag } }; // $addToSet ensures unique entries
      }
    const updatedPost = await talentPostDataModel.findOneAndUpdate(
        {post_id:post_id},
         updateQuery,
        { new: true } 
      );
    return res.json(updatedPost)
})


route.post('/votes/:id',verifyJwt,async(req,res)=>{
    
    const post_id =  req.params.id
    const owner_id = req.body.owner_id
    const vote = {
       voter_id : req.body.voter_id
    }

    const talentPost = await talentPostDataModel.findOne(
        {post_id:post_id}
        )

    if(! talentPost) { 
        return res.json("expired")
    }
    
    let updateQuery;

    const userLiked = talentPost.votes.find(vote => vote.voter_id == req.body.voter_id);
    if (userLiked) {
        updateQuery = { $pull: { votes: vote } };
      } else {
        updateQuery = { $addToSet: { votes: vote } }; // $addToSet ensures unique entries
      }
    const updatedPost = await talentPostDataModel.findOneAndUpdate(
        {post_id:post_id},
         updateQuery,
        { new: true } 
      );
    return res.json(updatedPost)
})

// **************************** Comments ***************************

route.get('/post/comments/:id',verifyJwt,async(req,res)=> {
    const post_id = req.params.id
    let postData = await talentPostDataModel.findOne({post_id:post_id})
    // if(!postData) 
    //   {
    //     return res.json("empty")   
    //   }
    return res.json(postData).status(200)
 })

 route.post('/posts/:id',verifyJwt,async(req,res)=> {
  console.log(req.params.id)
    const post_id = req.params.id.toString()
    const commentData={
          _id :new mongoose.Types.ObjectId(),
          commenter_id : req.body.commenter_id,
          profile_img:req.body.profile_img,
          name:req.body.name,
          comment:req.body.comment
        }
    let postData = await talentPostDataModel.findOne({post_id:post_id})
    // if(!postComment) {
    //      const data = {
    //        post_id : req.body.post_id,
    //        user_id : req.body.user_id,
    //        content:[commentData]
    //      }   
    //      let newCommentData = new commentModel(data)
    //      await newCommentData.save()
    //      return res.json(newCommentData)   
    //    }

    postData.comments.push(commentData)
    await postData.save()
    res.json(postData).status(200)
    }     
 )


route.patch('/posts/comment/:id',verifyJwt,async(req,res)=> {
  console.log(req.body.comment_id)
  const post_id = req.params.id;
  const comment_id = req.body.comment_id
  let postComment = await commentModel.findOne(
      {post_id:post_id 
      }
     
  )
  postComment.content = postComment.content.filter(el => el._id.toString() !== comment_id.toString())
  await postComment.save()
  return res.json(postComment).status(200)
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
             country:req.body.country,
             city:req.body.city,
             thumbNail_URL: req.body.thumbNail,
             talentRoom_id: req.body.room_id,
             createdAt: new Date()
            }  
    
    const newTalent = await talentModel.findByIdAndUpdate(
        _id,
        {
            $push: { contestants : contestant }
         },
         { new:true } 
    )
    const newPostData = new talentPostDataModel(
         {
          post_id : newObjectId,
          owner_id : req.body.user_id,
          likes:[],
          votes:[],
          comments:[]
         })
    await newPostData.save()

    const friend = await friendModel.findOne({receiver_id:req.body.user_id})
   
    if(friend)
      friend.friends.forEach(async(friend) =>{
      
        let   message = "has participated in a talent show"     
        const notification = {
            receiver_id:friend.sender_id,
            type:"talent",
            isRead:false,
            message:message , 
            content: {  
                sender_id:req.body.user_id,
                talentRoom_id:_id,
                name:newTalent.name,
                region:newTalent.region,   
            }
          
        }

        await notificationModel(notification).save()
        
    })

    if(!newTalent) return res.json({error:"expired"}).status(404)
    res.json(newTalent)
})


route.get('/room/:id',verifyJwt, async(req,res)=>{
    const room_id = req.params.id;
    const talentRoom = await talentModel.findById(room_id)
    if(!talentRoom) return res.json("post expired")
    res.json(talentRoom).status(200)
   })

   route.get('/rooms',verifyJwt, async(req,res)=>{
    const { name } = req.query;
    const talentRooms = await talentModel.find({name:name})
    if(!talentRooms) return res.json("post expired")
    res.json(talentRooms).status(200)
   })


route.patch('/delete/:id',verifyJwt, async(req,res)=>{
    const room_id = req.params.id;
    const user_id = req.body.user_id;
    const post_id = req.body.post_id;
    const talentRoom = await talentModel.findById(room_id)
    if(!talentRoom) return res.json("post expired")
    const deletedPost = await talentPostDataModel.findOneAndDelete({post_id:post_id})
    console.log(deletedPost)
    talentRoom.contestants = talentRoom.contestants.filter(contestant => contestant.user_id !== user_id)
    await talentRoom.save()
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