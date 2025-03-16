const express = require('express')
const {ObjectId} = require('mongodb')
const commentModel = require('../models/comments.js')
const challengeModel = require('../models/challenge.js')
const favouriteModel = require('../models/favourites.js')
const data = require('../utilities/data.js')
const upload = require('../multer.js')
const likeModel = require ('../models/likes.js')
const mongoose = require('mongoose')
const followerModel = require('../models/followers.js')
const { findByIdAndUpdate } = require('../models/users.js')
const notificationModel = require('../models/notifications.js')
const friendModel = require('../models/friends.js')
const jwt = require('jsonwebtoken')

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
route.post('/uploads',verifyJwt,async(req,res)=>{
   
    const newObjectId = new mongoose.Types.ObjectId();
    const timeLapse =new Date();
    const challenge = {
        origin_id:req.body.origin_id,
        video_url:req.body.video_url,
        desc: req.body.description,
        category : "eating context",
        like_count:0,    
        type:req.body.type,
        privacy:req.body.privacy,
        invited_friends:req.body.friendList,
        audience:req.body.audience,
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
                challenge_id:newChallenge._id.toString(),
                name:req.body.name,
                profile_img:req.body.profile_img,
            }
            
        }
        const newNotification = await notificationModel(notification).save()
    })
    const friend = await friendModel.findOne({receiver_id:req.body.origin_id})
    if(friend)
      friend.friends.forEach(async(friend) =>{
        if(!follower.followers.find(follower => follower.follower_id == friend.sender_id))
        {
        const notification = {
            receiver_id:friend.sender_id,
            type:"followers",
            isRead:false,
            message: "has create new Challenge",
            content: {
                sender_id:req.body.origin_id,
                challenge_id:newChallenge._id.toString(),
                name:req.body.name,
                profile_img:req.body.profile_img,
            }
          
        }

        await notificationModel(notification).save()
    }           
    })
    res.json( newChallenge)
})

route.post('/uploads/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
    
    const newObjectId = new mongoose.Types.ObjectId();
    const _id = req.params.id
    console.log(req.body)
    const participant = {
             _id: newObjectId,    
             user_id:req.body.user_id ,
             video_url:req.body.video_url,
             likes:0,
             votes:0,
             profile_img:req.body.profile_img,
             name:req.body.name,
             email:req.body.email,
             createdAt: new Date()
            }  
    
    const challenge = await challengeModel.findByIdAndUpdate(
        _id,
        {
            $push: { participants : participant }
         },
         { new:true } 
    )
    if(!challenge) return res.json({error:"challenge expired"}).status(404)
    
    const notification = {
            receiver_id:challenge.origin_id,
            type:"followers",    
            isRead:false,   
            message: "has Replied to your Challenge",
            content: {
                sender_id:req.body.origin_id,
                challenge_id:_id,
                name:req.body.name,
                profile_img:req.body.profile_img,
            }
            
    }
    await notificationModel(notification).save()

    const like =  new likeModel({
            post_id: newObjectId,
            user_id:req.body.user_id,
            like:false,
            vote:false
    })  
    await like.save()
    const follower = await followerModel.findOne({user_id:req.body.origin_id})
    if(follower)
      follower.followers.forEach(async(follower) =>{
      if(challenge.origin_id !== follower.follower_id ){
        const notification = {
            receiver_id:follower.follower_id,
            type:"followers",    
            isRead:false,   
            message: "has participated in a Challenge",
            content: {
                sender_id:req.body.origin_id,
                challenge_id:_id,
                name:req.body.name,
                profile_img:req.body.profile_img,
            }
            
        }
        const newNotification = await notificationModel(notification).save()
      }
    })
    const friend = await friendModel.findOne({receiver_id:req.body.user_id})
    if(friend)
      friend.friends.forEach(async(friend) =>{
        if(challenge.origin_id !== friend.sender_id ){
        if(!follower.followers.find(follower => follower.follower_id === friend.sender_id))
        {
        const notification = {
            receiver_id:friend.sender_id,
            type:"followers",
            isRead:false,
            message: "has participated in a Challenge",
            content: {
                sender_id:req.body.origin_id,
                challenge_id:_id,
                name:req.body.name,
                profile_img:req.body.profile_img,
            }
          
        }

        await notificationModel(notification).save()
      }
    } 
    })

    res.json(challenge)
})
   
// get user created by user 

route.get('/all/:id',verifyJwt, async(req,res)=> {
    const origin_id = req.params.id;
    let challenges = await challengeModel.find({
        participants:{$elemMatch: {user_id:origin_id }}
    })
    // challenges = challenges.filter(challenge => challenge.privacy == "Public")
    // challenges = challenges.filter(challenge => 
    //    challenge.participants.find(participant => participant.user_id == challenge.origin_id)
    // )
    res.json(challenges)   
})

route.get('/original/public/:id',verifyJwt, async(req,res)=> {
    const origin_id = req.params.id;
    let challenges = await challengeModel.find({origin_id:origin_id})
    challenges = challenges.filter(challenge => challenge.privacy == "Public")
    challenges = challenges.filter(challenge => 
       challenge.participants.find(participant => participant.user_id == challenge.origin_id)
    )
    res.json(challenges)   
})
 
route.get('/original/private/:id',verifyJwt, async(req,res)=> {
    const origin_id = req.params.id;
    let challenges = await challengeModel.find({origin_id:origin_id})
    challenges = challenges.filter(challenge => challenge.privacy == "Private")
    challenges = challenges.filter(challenge => 
       challenge.participants.find(participant => participant.user_id == challenge.origin_id)
    )
    res.json(challenges)   
})
         

route.get('/participate/public/:id',verifyJwt,async(req,res)=> {
    const origin_id = req.params.id;   
    // const challenges = await challengeModel.find({origin_id:origin_id})
    let challenges = await challengeModel.find({
        participants:{$elemMatch: {user_id:origin_id }}
    })
    challenges = challenges.filter(challenge => challenge.origin_id != origin_id)
    challenges = challenges.filter(challenge =>challenge.privacy == "Public")
    res.json(challenges)   
})
route.get('/participate/private/:id',verifyJwt,async(req,res)=> {
    const origin_id = req.params.id;   
    // const challenges = await challengeModel.find({origin_id:origin_id})
    let challenges = await challengeModel.find({
        participants:{$elemMatch: {user_id:origin_id }}
    })
    challenges = challenges.filter(challenge => challenge.origin_id != origin_id)
    challenges=challenges.filter(challenge =>challenge.privacy == "Private")

    res.json(challenges)   
})
   
// find any other challenges that don't include the user
route.get('/top/:id',verifyJwt,validateMongoObjectId,verifyJwt,async(req,res)=> {
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
route.route('/challenge/like/')
    .get(verifyJwt,async(req,res)=>{  
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
        if(!challenge) return res.json("post expired").status(404)
        if(!challenge.participants.find(el => el._id.toString() === query.post_id))
                return res.json("post expired")
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
    .get(verifyJwt,async(req,res)=>{  
            const ids = req.query.ids.split(',');
            const query = {
                user_id:ids[0],
                post_id:ids[1],   
            }
            const challenge_id = ids[2]
            let like = await likeModel.findOne(
                query             
            )  
            const challenge = await challengeModel.findById(challenge_id) 
            if(!challenge) return res.json("post expired").status(404)
            if(!challenge.participants.find(el => el._id.toString() === query.post_id))
                return res.json("post expired")
            if(!like) like = await new likeModel({user_id:query.user_id,post_id:query.post_id}).save()
            const elementIndex = challenge.participants.findIndex(el => el._id.toString() === query.post_id);
            const likes = challenge.participants[elementIndex].likes 
            const votes = challenge.participants[elementIndex].votes 
            const likeData = {isLiked:like.like,like_count:likes,isVoted:like.vote,vote_count:votes}
            res.json(likeData).status(200)      
    })   
            
    // challenge vote    
    route.route('/challenge/vote/' )
    .get(verifyJwt,async(req,res)=>{  
        const ids = req.query.ids.split(',');
        const query = {
            user_id:ids[0],   
            post_id:ids[1],
            challenge_id :ids[2]
        }      
        let  find = await likeModel.findOne({user_id:query.user_id,post_id:query.post_id})
        // if(!find) return res.json("post expired").status(404) 
        let challenge = await challengeModel.findById(query.challenge_id)
        if(!challenge) return res.json("post expired").status(404)
        if(!challenge.participants.find(el => el._id.toString() === query.post_id))
            return res.json("post expired")
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
     

    route.get('/find/:id',verifyJwt,validateMongoObjectId, async(req,res)=>{
     const challenge_id = req.params.id;
     const challenge = await challengeModel.findById(challenge_id)
     if(!challenge) return res.json("post expired")
     res.json(challenge).status(200)
    })
    

    route.patch('/quit/:id',verifyJwt,validateMongoObjectId, async(req,res)=> {
        const challenge_id = req.params.id;
        const userId = req.body.user_id ; 
        let challenge = await challengeModel.findById(
             challenge_id 
            )
        if(!challenge) return res.json("challenge expired")
        const deleteNotifications = await notificationModel.deleteMany({
                "content.challenge_id":challenge_id,
                "content.sender_id":userId
               },{new:true})  
        const participantToDelete = challenge.participants.find(participant => participant.user_id === userId)  
        await likeModel.deleteMany({post_id:participantToDelete._id.toString()})                               
        if (challenge.participants.length == 1 ) {           
           await challengeModel.findByIdAndDelete(challenge_id) 
           return res.json("deleted").status(200)
        } 
        challenge.participants = challenge.participants.filter(participant => participant.user_id !== userId)
        await challenge.save()
        res.json(challenge).status(200)
    })          
    
    
    route.patch('/mode/:id',verifyJwt,validateMongoObjectId, async(req,res)=> {

        const challenge_id = req.params.id;
        const newMode = req.body.mode; 
        console.log(newMode)
        let challenge = await challengeModel.findByIdAndUpdate(
             challenge_id ,
             { $set: { audience: newMode } },
             { new: true }
            )
        
        res.json(challenge).status(200)
    }) 
  // ****************************Comments ***************************

   route.get('/posts/:id',verifyJwt,async(req,res)=> {
      const post_id = req.params.id
      let postComment = await commentModel.findOne({post_id:post_id})
    //   if(!postComment) 
    //     {
    //     return res.json("empty")
    //     }
      return res.json(postComment).status(200)
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
      let postComment = await commentModel.findOne({post_id:post_id})
      if(!postComment) {
           const data = {
             post_id : req.body.post_id,
             user_id : req.body.user_id,
             content:[commentData]
           }   
           let newCommentData = new commentModel(data)
           await newCommentData.save()
           return res.json(newCommentData)   
         }

      postComment.content.push(commentData)
      await postComment.save()
      res.json(postComment).status(200)
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
    console.log(postComment)
    await postComment.save()
    return res.json(postComment).status(200)
 })
 
 route.post('/favourite/:id',verifyJwt,async(req,res)=> {
    const user_id = req.params.id;
    const challenge = await challengeModel.findById(
        req.body._id 
       )
    if(!challenge) return res.json("challenge expired").status(404)   
    let favourite = await favouriteModel.findOne(
        {user_id:user_id  } 
    )
    if(!favourite)  {
        const newFavourite = new favouriteModel({
            user_id:user_id,
            favourites:[req.body]
        }
        )
        await newFavourite.save()
        return res.json(newFavourite)
    }
    favourite.favourites.push(req.body)
    await favourite.save()
    return res.json(favourite).status(200)
 })
 

 route.get('/favourite/:id',verifyJwt,async(req,res)=> {
    const user_id = req.params.id;
    let favourite = await favouriteModel.findOne(
        {user_id:user_id} 
    )
    if(!favourite)  {
        const newFavourite = new favouriteModel({
            user_id:user_id,
            favourites:[]
        }
        )
        await newFavourite.save()
        return res.json(newFavourite)
    }
    return res.json(favourite).status(200)
 })

 route.patch('/favourite/:id',verifyJwt,async(req,res)=> {
    const user_id = req.params.id;
    // const challenge = await challengeModel.findById(
    //     req.body._id 
    //    )
    // if(!challenge) return res.json("challenge expired").status(404)   
    let favourite = await favouriteModel.findOneAndUpdate(
        {user_id:user_id} ,
       { $pull: {favourites : {_id:req.body._id} } },
       { new:true } 
    )
    // if(!favourite)  {
    //     const newFavourite = new favouriteModel({
    //         user_id:user_id,
    //         favourites:[]
    //     }
    //     )
    //     await newFavourite.save()
    //     return res.json(newFavourite)
    // }
    return res.json(favourite).status(200)
 })


// middleware to validate mongo objectId _id
function validateMongoObjectId(req,res,next) {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({Error:"error in request ID"});
    next()   
}            
 
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