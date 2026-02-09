// const express = require('express')
// const {ObjectId} = require('mongodb')
// const commentModel = require('../models/comments.js')
// const challengeModel = require('../models/challenge.js')
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
// const jwt = require('jsonwebtoken')
// const talentPostDataModel = require('../models/talentPostData.js')

import express from 'express';
import { ObjectId } from 'mongodb';
import commentModel from '../models/comments.js';
import challengeModel from '../models/challenge.js';
import favouriteModel from '../models/favourites.js';
import { users, challenges } from '../utilities/data.js';
// import upload from '../multer.js';
import likeModel from '../models/likes.js';
import mongoose from 'mongoose';
import followerModel from '../models/followers.js';
// import { findByIdAndUpdate } from '../models/users.js';
import notificationModel from '../models/notifications.js';
import friendModel from '../models/friends.js';
import viewerModel from '../models/postViewers.js';
import jwt from 'jsonwebtoken';  
import talentPostDataModel from '../models/talentPostData.js';
const route = express.Router();


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
    const timeLapse = new Date();
    const challenge = {
        origin_id:req.body.origin_id,
        video_url:req.body.video_url,
        desc: req.body.description,
        like_count:0,    
        type:req.body.type,
        privacy:req.body.privacy,
        invited_friends:req.body.friendList,
        name:req.body.name,
        thumbNail_URL: req.body.thumbNail,
        profile_img:req.body.profile_img,
        participants:[{
             _id: newObjectId,
             user_id:req.body.origin_id,
             video_url:req.body.video_url,
             likes:0,
             votes:0,
             profile_img:req.body.profile_img,
             name:req.body.name,
             email:req.body.email,
             thumbNail_URL: req.body.thumbNail,
             createdAt:timeLapse
            }] ,
        voters:[]
    }

    const newChallenge = await challengeModel(challenge)
    await newChallenge.save()

    const viewerPost = new viewerModel({
        post_id:newObjectId,
        user_id:req.body.origin_id,
    })
    await viewerPost.save()

//     const follower = await followerModel.findOne({user_id:req.body.origin_id})
//     if(follower) if(follower.followers.length > 0)
//       follower.followers.forEach(async(follower) =>{
//         const notification = {
//             receiver_id:follower.follower_id,
//             type:"followers",
//             isRead:false,
//             message: "has create new Challenge",
//             content: {
//                 sender_id:req.body.origin_id,
//                 challenge_id:newChallenge._id.toString(),
//                 name:req.body.name,
//                 profile_img:req.body.profile_img,
//             }
            
//         }
//         await notificationModel(notification).save()
//    }) 

    const friend = await friendModel.findOne({user_id:req.body.origin_id})
   
    if(friend)
      friend.friends.forEach(async(friend) =>{
        // if(!follower.followers.find(follower => follower.follower_id == friend.sender_id))
        // {
        let message = ""
        if (req.body.privacy == "Private") {
            if(req.body.friendList.find(fr => fr.user_id == friend.user_id))
             message = "Invited you to  participate in his challenge"
            else message =  "has created a new Challenge" 
        }
        else message = "has created a new Challenge"
                
        const notification = {
            receiver_id:friend.user_id,
            type:"followers",
            isRead:false,
            message:message , 
            content: {  
                sender_id:req.body.origin_id,
                challenge_id:newChallenge._id.toString(),
                name:req.body.name,
                profile_img:req.body.profile_img,   
                challengeType: challenge.type,
                challengePrivacy : challenge.privacy
            }
        }
        await notificationModel(notification).save()
        
    })

    res.json(newChallenge)
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
             thumbNail_URL: req.body.thumbNail,
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
                sender_id:req.body.user_id,
                challenge_id:_id,
                name:req.body.name,
                profile_img:req.body.profile_img,
                challengeType: challenge.type,
                challengePrivacy : challenge.privacy
            }
            
    }
    await notificationModel(notification).save()

    challenge.participants.forEach(async(participant) =>{
        if(challenge.origin_id !== participant.user_id && participant.user_id !== req.body.user_id ){
        let message = "has replied to the challenge you've participated in"
        const notification = {
            receiver_id:participant.user_id,
            type:"followers",
            isRead:false,
            message: message,
            content: {
                sender_id:req.body.user_id,
                challenge_id:_id,
                name:req.body.name,
                profile_img:req.body.profile_img,
                challengeType: challenge.type,
                challengePrivacy : challenge.privacy
            }
          
        }

        await notificationModel(notification).save()
    } 
    })

    // const like =  new likeModel({
    //         post_id: newObjectId,
    //         user_id:req.body.user_id,
    //         like:false,
    //         vote:false
    // })  
    // await like.save()

    const viewerPost = new viewerModel({
        post_id:newObjectId,
        user_id:req.body.user_id,
    })
    await viewerPost.save()

    // const follower = await followerModel.findOne({user_id:req.body.origin_id})
    // if(follower)
    //   follower.followers.forEach(async(follower) =>{
    //   if(challenge.origin_id !== follower.follower_id ){
    //     const notification = {
    //         receiver_id:follower.follower_id,
    //         type:"followers",    
    //         isRead:false,   
    //         message: "has participated in a Challenge",
    //         content: {
    //             sender_id:req.body.origin_id,
    //             challenge_id:_id,
    //             name:req.body.name,
    //             profile_img:req.body.profile_img,
    //         }
            
    //     }
    //     const newNotification = await notificationModel(notification).save()
    //   }
    // })


    const friend = await friendModel.findOne({user_id:req.body.user_id})
    const filterFriends = friend.friends.filter(friend =>
                    !challenge.participants.find(
                     participant => participant.user_id == friend.user_id
                   ) )
    if(friend)
      filterFriends.forEach(async(friend) =>{
        if(challenge.origin_id !== friend.user_id ){
        let message =""
        if(challenge.participants.find(participant => participant.user_id == friend.user_id)) {
             message = "has replied to the challenge you've participated in  "
        }else {
            if(challenge.privacy == "Private") {
                if(challenge.invited_friends.find(invite=>invite.sender_id == friend.user_id))
                     message = "has joined the challenge you are intvied to"
                else message = "has participated in a Challenge"
            }else
            message = "has participated in a Challenge"
        }
        const notification = {
            receiver_id:friend.user_id,
            type:"followers",
            isRead:false,
            message: message,
            content: {
                sender_id:req.body.user_id,
                challenge_id:_id,
                name:req.body.name,
                profile_img:req.body.profile_img,
                challengeType: challenge.type,
                challengePrivacy : challenge.privacy
            }
          
        }

        await notificationModel(notification).save()
    } 
    })

    const newPostData = new talentPostDataModel(
        {
         post_id : newObjectId,
         owner_id : req.body.user_id,
         room_id:challenge._id,
         likes:[],
         votes:[],
         flags:[],
         comments:[]
        })
        await newPostData.save()

    res.json(challenge)
})


route.patch('/update/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
    console.log(req.body.thumbNail_URL)
     const challenge_id = req.params.id
     const user_id = req.body.user_id
     const thumbNail_URL = req.body.thumbNail_URL
     let challenge = await challengeModel.findById(
        challenge_id 
     )
     const index = challenge.participants.findIndex(participant => participant.user_id === user_id)
     challenge.participants[index]["thumbNail_URL"] = thumbNail_URL 
     await challenge.save()
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
    let challenges = await challengeModel.find({origin_id:origin_id}).sort({ createdAt: 'desc' })
    // challenges = challenges.filter(challenge => challenge.privacy == "Public")
    // challenges = challenges.filter(challenge => 
    //    challenge.participants.find(participant => participant.user_id == challenge.origin_id)
    // )
    res.json(challenges)   
})

route.get('/original/private/:id',verifyJwt, async(req,res)=> {
    const origin_id = req.params.id;
    let challenges = await challengeModel.find({origin_id:origin_id}).sort({ updatedAt: 'desc' })
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
    }).sort({ updatedAt: 'desc' })
    challenges = challenges.filter(challenge => challenge.origin_id != origin_id)
    // challenges = challenges.filter(challenge =>challenge.privacy == "Public")
    res.json(challenges)   
})

route.get('/participate/private/:id',verifyJwt,async(req,res)=> {
    const origin_id = req.params.id;   
    // const challenges = await challengeModel.find({origin_id:origin_id})
    let challenges = await challengeModel.find({
        participants:{$elemMatch: {user_id:origin_id }}
    }).sort({ createdAt: 'desc' })
    challenges = challenges.filter(challenge => challenge.origin_id != origin_id)
    // challenges=challenges.filter(challenge =>challenge.privacy == "Private")

    res.json(challenges)   
})
   
// find any other challenges that don't include the user
route.get('/top/:id',verifyJwt,validateMongoObjectId,verifyJwt,async(req,res)=> {
    const idToExclude = req.params.id;
    let challenges = await challengeModel.find({ origin_id: { $ne: idToExclude } }).sort({ createdAt: 'desc' })
    challenges = challenges.filter(challenge => 
        !challenge.participants.find(participant => participant.user_id === idToExclude)
    )
    let challenge1 = await challengeModel.find({ origin_id: idToExclude })
    challenge1 = challenge1.filter(challenge => 
        !challenge.participants.find(participant => participant.user_id === idToExclude)
    )
    res.json(challenges.concat(challenge1)).status(200)  
})  
    


// ********************************** post data and operations ********************


route.post('/post/:id',verifyJwt,async(req,res)=>{
    const post_id =  req.params.id
    console.log(req.body)
    const talentPost = await talentPostDataModel.findOne(
        {post_id:post_id}
        )
     if(!talentPost) 
      { const newPostData = new talentPostDataModel(
        {
         post_id : post_id,
         owner_id : req.body.owner_id,
         room_id:req.body.room_id,
         likes:[],
         votes:[],
         flags:[],
         comments:[]
        })
        await newPostData.save()
        return res.json(newPostData)   
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
      const talent = await challengeModel.findByIdAndUpdate(
        req.body.room_id,
        {
            $set: {
              "participants.$[item].votes":updatedPost.votes.length,
              "participants.$[item].likes":updatedPost.likes.length,
            }
          },
          {
            arrayFilters: [{ "item.user_id": owner_id }],
            new: true 
          }
    )
    return res.json(updatedPost)
})



route.post('/votes/:id',verifyJwt,async(req,res)=>{
    
    const post_id =  req.params.id
    const owner_id = req.body.owner_id
    const voter_id = req.body.voter_id

    const vote = {
       voter_id : req.body.voter_id
    }

    const talent = await challengeModel.findById(req.body.room_id)

    const talentPost = await talentPostDataModel.findOne(
      {post_id:post_id}
      )
    

    if(!talentPost || !talent.participants.find(c => c._id == post_id)) { 
        return res.json("expired")
    }

    const post_owner_name = talent.participants.find(c => c._id == post_id).name

    const voter = talent.voters.find( v => 
                                    v.voter_id == voter_id
                                     )
    
    if(!voter){
        talent.voters.push({
                  voter_id : req.body.voter_id,
                  post_id : post_id,
                  name : post_owner_name,
                  createdAt: new Date()
        })
        talentPost.votes.push(vote)

    }else{   
        talent.voters = talent.voters.filter(v => v.voter_id !== voter_id)
        if(voter.post_id !== post_id){
            talent.voters.push({
            voter_id : voter_id,
            post_id : post_id,
            name : post_owner_name,
            createdAt:new Date()
               })
            talentPost.votes.push(vote)   
            await talentPostDataModel.findOneAndUpdate(
                  { post_id : voter.post_id },
                  { $pull : { votes: vote } },
                  { new : true } 
            );
            let index = talent.participants.findIndex(c => c._id == voter.post_id) 
            let participant = talent.participants[index]
            participant.votes --;
            talent.participants[index]=participant  

          }
        else{
            talentPost.votes = talentPost.votes.filter(v => v.voter_id !== voter_id )
            }
    }
    await talent.save()
    await talentPost.save()
    const talentRoom = await challengeModel.findByIdAndUpdate(
        req.body.room_id,
        {
            $set: {
              "participants.$[item].votes":talentPost.votes.length,
              "participants.$[item].likes":talentPost.likes.length,
             }
          },
          {
            arrayFilters : [{ "item.user_id" : owner_id }],
            new: true 
          }
    )
    talentRoom.participants.sort((a, b) => {
        if(a.votes !== b.votes){
            b.votes - a.votes
        }else {
            b.likes - a.likes
        }
        
        })
    await talentRoom.save()
    return res.json(talentPost)
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
    const talent = await challengeModel.findById(talentPost.room_id)
    if(updatedPost.flags.length >= 7)  {
         if(updatedPost.likes.length < updatedPost.flags.length * 10 )
         {
            talent.participants = talent.participants.filter(contestant => contestant.user_id !== owner_id)
            await talent.save()
            // await talentPostDataModel.findOneAndDelete({post_id:post_id})
         }
    }
    return res.json(updatedPost)
})


     

    route.get('/find/:id',verifyJwt,validateMongoObjectId, async(req,res)=>{
     const challenge_id = req.params.id;
     const challenge = await challengeModel.findById(challenge_id)
     if(!challenge) return res.json("post expired")
     if(challenge.voters == undefined) {
        challenge.voters = []
    }

    challenge.participants.sort((a, b) => {
        if(a.votes !== b.votes){
           return b.votes - a.votes
        }else {
           return b.likes - a.likes
        }
    }
    )
    challenge.participants.forEach((c ,index) =>{
        challenge.participants[index] = {...c,rank:index + 1};
     })

    await challenge.save()
    console.log(challenge)
    res.json(challenge).status(200)
    })




    route.get('/invites/:id',verifyJwt,validateMongoObjectId, async(req,res)=>{
        const user_id = req.params.id;
        const challenges = await challengeModel.find({
            'participants.user_id': { $nin: [user_id] },
            'invited_friends.user_id': user_id
          }).sort({ createdAt: -1 });
        console.log(challenges)
       res.json(challenges).status(200)
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
    

    route.get('/general/:id',verifyJwt,async(req,res)=>{
        const user_id = req.params.id
        const friends = await friendModel.findOne({
                       user_id : user_id
                   })
       let friendIDS = []
       friends.friends.forEach(f => friendIDS.push(f.user_id))

       let challenges = await challengeModel.find({
        'participants.user_id': { $in: friendIDS }
       })
       challenges = challenges.filter(c => !c.participants.some(p => p.user_id === user_id) &&
                                         c.origin_id !== user_id )
       res.json(challenges)
  })


  route.get('/user/:id',verifyJwt,async(req,res)=>{
   const user_id = req.params.id
   const challenges = await challengeModel.find({
    'participants.user_id': user_id
   })
    // const userTalents = await talentModel.find({
    //   $or: [
    //     { 'contestants.user_id':  user_id
    //       }, 
    //     { 'queue.user_id': user_id
          
    //       }, 
    //       { 'eliminations.user_id': user_id             
    //       }
    //   ]
    //  });
    console.log(challenges)
   res.json(challenges)
})

    
    // route.patch('/mode/:id',verifyJwt,validateMongoObjectId, async(req,res)=> {

    //     const challenge_id = req.params.id;
    //     const newMode = req.body.mode; 
    //     console.log(newMode)
    //     let challenge = await challengeModel.findByIdAndUpdate(
    //          challenge_id ,
    //          { $set: { audience: newMode } },
    //          { new: true }
    //         )
        
    //     res.json(challenge).status(200)
    // }) 
  // **************************** Comments ***************************

   route.get('/posts/:id',verifyJwt,async(req,res)=> {
      const post_id = req.params.id
      let postComment = await commentModel.findOne({post_id:post_id})
      if(!postComment) 
        {
          return res.json("empty")   
        }
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
    await postComment.save()
    return res.json(postComment).status(200)
 })
 //***************************favourites */
 route.post('/favourite/:id',verifyJwt,async(req,res)=> {
    const user_id = req.params.id;
    console.log(req.body)
    let favourite = await favouriteModel.findOne(
        {user_id:user_id } 
    )
    if(!favourite)  {
        const newFavourite = new favouriteModel({
            user_id:user_id,
            favourites:[{
                         _id:req.body.challenge_id , 
                         dataType:"challenge",
                         createdAt : new Date()
                        }]
        } 
        )
        await newFavourite.save()
        return res.json(newFavourite)
    }
    favourite.favourites.push({
                           _id:req.body.challenge_id,
                            dataType:"challenge",
                            createdAt : new Date()
                        })
    await favourite.save()
    return res.json(favourite).status(200)
  })
  
  route.patch('/favourite/:id',verifyJwt,async(req,res)=> {
    const user_id = req.params.id;
    let favourite = await favouriteModel.findOne(
        {user_id : user_id}
    )
    favourite.favourites = favourite.favourites.filter(f => f._id !== req.body.challenge_id  )
    await favourite.save()
    console.log(favourite)
    return res.json(favourite).status(200)
  })
  

  route.post('/favourites/:id',verifyJwt,async(req,res)=> {
    const ids = req.body
    const favourites = await challengeModel.find({ _id: { $in: ids } });
    // const talent = await talentModel.findById(
    //     req.body.talentRoom_id 
    //    )
    // let favourite = await favouriteModel.findOne(
    //     {user_id:user_id } 
    // )
    // if(!favourite)  {
    //     const newFavourite = new favouriteModel({
    //         user_id:user_id,
    //         favourites:[{_id:req.body.talentRoom_id , dataType:"talent"}]
    //     } 
    //     )
    //     await newFavourite.save()
    //     return res.json(newFavourite)
    // }
    // favourite.favourites.push({_id:req.body.talentRoom_id , dataType:"talent"})
    // await favourite.save()
    return res.json(favourites).status(200)
  })

 route.get('/favourite/:id',verifyJwt,async(req,res)=> {
    const user_id = req.params.id;
    let favourite = await favouriteModel.findOne(
        {user_id:user_id} 
    ).sort({ createdAt: 'desc' })
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

//  route.patch('/favourite/:id',verifyJwt,async(req,res)=> {
//     const user_id = req.params.id;
//     let favourite = await favouriteModel.findOneAndUpdate(
//         {user_id:user_id} ,
//        { $pull: {favourites : {_id:req.body._id} } },
//        { new:true } 
//     )
//     return res.json(favourite).status(200)
//  })





  //*************************** Viewers */
  route.get('/viewer/:id',verifyJwt,async(req,res)=> {
    const post_id = req.params.id;
    const viewer = await viewerModel.findOne(
        {post_id:post_id} 
       )
    // if(!viewer)  {
    //     const newViewer = new viewerModel({
    //         post_id:post_id,
    //         user_id:req.body.user_id,
    //         viewer:[]
    //     }
    //     )
    //     await newViewer.save()
    //     return res.json(newViewer)
    // }
    // viewer.viewers.push({viewer_id:req.body.viewer_id})
    // await viewer.save()
    return res.json(viewer).status(200)
 })

  route.post('/viewer/:id',verifyJwt,async(req,res)=> {
    const post_id = req.params.id;
    const viewer = await viewerModel.findOne(
        {post_id:post_id} 
       )
    // if(!viewer) return res.json("post expired").status(404)   
    
    if(!viewer)  {
        const newViewer = new viewerModel({
            post_id:post_id,
            user_id:req.body.user_id,
            viewers:[{viewer_id:req.body.viewer_id}]
        }
        )
        await newViewer.save()
        return res.json(newViewer)
    }
    viewer.viewers.push({viewer_id:req.body.viewer_id})
    await viewer.save()
    return res.json(viewer).status(200)
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
            
export default route; 