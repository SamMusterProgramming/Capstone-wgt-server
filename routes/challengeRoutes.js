const express = require('express')
const {ObjectId} = require('mongodb')
const commentModel = require('../models/comments.js')
const challengeModel = require('../models/challenge.js')
const data = require('../utilities/data.js')
const upload = require('../multer.js')
const likeModel = require ('../models/likes.js')
const mongoose = require('mongoose')
const followerModel = require('../models/followers.js')
const { findByIdAndUpdate } = require('../models/users.js')
const notificationModel = require('../models/notifications.js')
const friendModel = require('../models/friends.js')

route = express.Router();


route.get('/like/seed',async(req,res)=>{
    challengeModel.collection.drop() 
    likeModel.collection.drop() 
    followerModel.collection.drop() 
    res.json('azul')
})      


route.get('/challenges/seed',async(req,res)=>{
    challengeModel.collection.drop() // delete the collection document and inialise it with prototype data.js
    data.challenges.forEach(async(challenge) => {
      const newChallenge=  new challengeModel(challenge)
      await newChallenge.save()
    })
    const challenges = await challengeModel.find({}).limit(20)
    if(!challenges) return res.json({error:"challenge list is empty"})
    res.json(challenges).status(200) 
})


// firebase used here
route.post('/uploads',async(req,res)=>{
   
    const newObjectId = new mongoose.Types.ObjectId();
    const timeLapse = Date.now();
    const challenge = {
        origin_id:req.body.origin_id,
        video_url:req.body.video_url,
        desc: req.body.description,
        category : "eating context",
        like_count:0,    
        type:req.body.type,
        privacy:req.body.privacy,
        challengers:req.body.challengers,
        name:req.body.name,
        participants:[{
             _id: newObjectId,
             user_id:req.body.origin_id,
             video_url:req.body.video_url,
             likes:0,
             votes:0,
             profile_img:req.body.profile_img,
             name:req.body.name,
             email:req.body.email,
             createdAt:timeLapse
            }]    
    }
    const newChallenge = await challengeModel(challenge)
    await newChallenge.save()
    const like =  new likeModel({
        post_id:newObjectId,
        user_id:req.body.origin_id,
        like:false,
        vote:false
    })    
    await like.save()
    
    const follower = await followerModel.findOne({user_id:req.body.origin_id})
    if(follower)
      follower.followers.forEach(async(follower) =>{
        const notification = {
            receiver_id:follower.follower_id,
            type:"followers",
            isRead:false,
            message: "has create new Challenge",
            content: {
                sender_id:req.body.origin_id,
                challenge_id:newChallenge._id,
                name:req.body.name,
                profile_img:req.body.profile_img,
            }
            
        }
        const newNotification = await notificationModel(notification).save()
    })
    const friend = await friendModel.findOne({receiver_id:req.body.origin_id})
    if(friend)
      friend.friends.forEach(async(friend) =>{
        const notification = {
            receiver_id:friend.sender_id,
            type:"followers",
            isRead:false,
            message: "has create new Challenge",
            content: {
                sender_id:req.body.origin_id,
                challenge_id:newChallenge._id,
                name:req.body.name,
                profile_img:req.body.profile_img,
            }
          
        }
        console.log(notification)
        await notificationModel(notification).save()
    })
    res.json( newChallenge)
})

route.post('/uploads/:id',validateMongoObjectId,async(req,res)=>{
    
    const newObjectId = new mongoose.Types.ObjectId();
    const _id = req.params.id
    const participant = {
             _id: newObjectId,    
             user_id:req.body.user_id ,
             video_url:req.body.video_url,
             likes:0,
             votes:0,
             profile_img:req.body.profile_img,
             name:req.body.name,
             email:req.body.email
            }  
    
    const challenge = await challengeModel.findByIdAndUpdate(
        _id,
        {
            $push: { participants : participant }
         },
         { new:true } 
    )
    if(!challenge) return res.json({error:"can't save the video"})
    const like =  new likeModel({
            post_id: newObjectId,
            user_id:req.body.user_id,
            like:false,
            vote:false
    })  
    await like.save()
    res.json(challenge)
})
   
// get user created by user 
route.get('/original/:id',async(req,res)=> {
    const origin_id = req.params.id;
    let challenges = await challengeModel.find({origin_id:origin_id})
    challenges = challenges.filter(challenge => 
       challenge.participants.find(participant => participant.user_id == challenge.origin_id)
    )
    res.json(challenges)   
})
     

route.get('/participate/:id',async(req,res)=> {
    const origin_id = req.params.id;   
    // const challenges = await challengeModel.find({origin_id:origin_id})
    let challenges = await challengeModel.find({
        participants:{$elemMatch: {user_id:origin_id }}
    })
    challenges = challenges.filter(challenge => challenge.origin_id != origin_id)
    res.json(challenges)   
})
   
// find any other challenges that don't include the user
route.get('/top/:id',validateMongoObjectId,async(req,res)=> {
    const idToExclude = req.params.id;
    let challenges = await challengeModel.find({ origin_id: { $ne: idToExclude } })
    challenges = challenges.filter(challenge => 
        !challenge.participants.find(participant => participant.user_id === idToExclude)
    )
    let challenge1 = await challengeModel.find({ origin_id: idToExclude })
    challenge1 = challenge1.filter(challenge => 
        !challenge.participants.find(participant => participant.user_id === idToExclude)
    )
    res.json(challenges.concat(challenge1)).status(200)  
})  
    


/// likes **********************************
route.route('/challenge/like/' )
    .get(async(req,res)=>{  
        const ids = req.query.ids.split(',');
        const query = {
            user_id:ids[0],
            post_id:ids[1],
            challenge_id :ids[2]
        }

        let like = await likeModel.findOneAndUpdate(
           { user_id:query.user_id,post_id:query.post_id},
           [ { "$set": { "like": { "$eq": [false, "$like"] } } } ] , 
           { new: true } 
        )   

        if(!like) like = await new likeModel({user_id:query.user_id,post_id:query.post_id}).save()
        
        const challenge = await challengeModel.findById(query.challenge_id)
        const elementIndex = challenge.participants.findIndex(el => el._id.toString() === query.post_id);

        let likes = challenge.participants[elementIndex].likes 
        if (like.like)  likes = likes + 1 
        else {
            if(like.like !== 0)  likes = likes - 1  
        } 
        challenge.participants[elementIndex] ={...challenge.participants[elementIndex],likes:likes};
        await challenge.save()
        res.json({isLiked:like.like,like_count:likes}).status(200)    
    })   
         
route.route('/load/like/' )
    .get(async(req,res)=>{  
            const ids = req.query.ids.split(',');
            const query = {
                user_id:ids[0],
                post_id:ids[1],
            }
            const challenge_id = ids[2]
            let like = await likeModel.findOne(
                query
            )
            if(!like) like = await new likeModel({user_id:query.user_id,post_id:query.post_id}).save()
            const challenge = await challengeModel.findById(challenge_id)
            const elementIndex = challenge.participants.findIndex(el => el._id.toString() === query.post_id);
            const likes = challenge.participants[elementIndex].likes 
            const votes = challenge.participants[elementIndex].votes 
            const likeData = {isLiked:like.like,like_count:likes,isVoted:like.vote,vote_count:votes}
            res.json(likeData).status(200)      
    })   

    // challenge vote 
    route.route('/challenge/vote/' )
    .get(async(req,res)=>{  
        const ids = req.query.ids.split(',');
        const query = {
            user_id:ids[0],
            post_id:ids[1],
            challenge_id :ids[2]
        }
         
        let  find = await likeModel.findOne({user_id:query.user_id,post_id:query.post_id})
        let challenge = await challengeModel.findById(query.challenge_id)
        const elementIndex = challenge.participants.findIndex(el => el._id.toString() === query.post_id);
        let votes = challenge.participants[elementIndex].votes 

        if (find.vote) {
           find.vote = false
           challenge.participants[elementIndex] ={...challenge.participants[elementIndex],votes:votes-1};
           await find.save()
           await challenge.save()
           return res.json({isVoted:false,vote_count:votes-1})
        }
        else {
            let participants = challenge.participants.filter(participant => participant._id != query.post_id)
            let exist = null
            for (const participant of participants) {
              exist = await likeModel.findOne({user_id:query.user_id,post_id:participant._id})
              if (exist) if(exist.vote) break;
          }
        if(exist) if(exist.vote) return res.json({isVoted:false,vote_count:votes})
        challenge.participants[elementIndex] ={...challenge.participants[elementIndex],votes:votes+1};
        find.vote = true
        await find.save()
        await challenge.save()   
        return res.json({isVoted:true , vote_count:votes+1}).status(200)
        }   

    })   
     

    route.get('/find/:id',validateMongoObjectId, async(req,res)=>{
     const challenge_id = req.params.id;
     const challenge = await challengeModel.findById(challenge_id)
     res.json(challenge).status(200)
    })


    route.patch('/quit/:id', validateMongoObjectId, async(req,res)=> {
        const challenge_id = req.params.id;
        const userId = req.body.user_id ; 
        let challenge = await challengeModel.findById(
             challenge_id 
            )
        if (challenge.participants.length == 1 ) {
           await challengeModel.findByIdAndDelete(challenge_id)      
           return res.json("deleted").status(200)
        }
            
        challenge.participants = challenge.participants.filter(participant => participant.user_id !== userId)
        await challenge.save()
        res.json(challenge).status(200)
    })        

// middleware to validate mongo objectId _id
function validateMongoObjectId(req,res,next) {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({Error:"error in request ID"});
    next()   
}    
   

module.exports = route; 