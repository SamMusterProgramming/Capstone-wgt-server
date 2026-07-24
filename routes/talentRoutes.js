// const express = require('express')
// const {ObjectId} = require('mongodb')
// const commentModel = require('../models/comments.js')
// const talentModel = require('../models/talent.js')
// const talentPostDataModel  = require('../models/talentPostData.js')

// const jwt = require('jsonwebtoken')
// const mongoose = require('mongoose')
// const friendModel = require('../models/friends.js')
// const notificationModel = require('../models/notifications.js')
// const favouriteModel = require('../models/favourites.js')

import express from 'express';
import { ObjectId } from 'mongodb';
import commentModel from '../models/comments.js';
import talentModel from '../models/talent.js';
import talentPostDataModel from '../models/talentPostData.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import friendModel from '../models/friends.js';
import notificationModel from '../models/notifications.js';
import favouriteModel from '../models/favourites.js';
import b2 from '../B2.js';
import { deleteFileFromB2_Private, deleteFileFromB2_Public, getPublicUrlFromB2, getSignedUrlFromB2 } from '../utilities/blackBlazeb2.js';
import userModel from '../models/users.js';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { protect } from '../middleware/jwtProtect.js';
import { getClientIp, getLocationFromIP } from '../ipGeolocation.js';
import {
   addUserPerformance, createTalentStage, deleteContestantFromEliminations, deleteContestantFromQueue, 
   deleteUserPerformanceQueue, 
   deleteUserPerformanceStage, 
   generateTalentStage, getAllStages, getEliminatedUserBackToQueue, getFavouriteStages, getHotStages, getStagesByRegion, getTrendingStages, getUserContestantInStage, 
   joinStageOrQueueFirstPerformance, resignContestantFromStage, 
   toggleFavouriteStage
  } from '../controllers/talentController.js';
import { addComment, deleteComment, flagPost, getPostById, LikePost, votePost } from '../controllers/postController.js';

const route = express.Router();

// create talent stage , process edition , elimination 
route.post('/creates',protect,createTalentStage)
  
//get stages , stages of user 
route.get("/stages/region/:region", getStagesByRegion);
route.get('/stages',protect,getAllStages)  
route.get('/user/talent/:id',protect , getUserContestantInStage)
route.get('/hotStages/:id', protect, getHotStages)
route.get('/trendingStages/:countryCode', protect, getTrendingStages)


//favouriteStages
route.get("/favouriteStages/:id", protect,getFavouriteStages);
route.post('/favourite/:id',protect ,toggleFavouriteStage)

// user performances , add , update , delete , resign 
route.post('/uploads/:id', protect, joinStageOrQueueFirstPerformance);
route.patch('/back/queue/:id',protect, getEliminatedUserBackToQueue)
route.patch('/update/:id',protect,addUserPerformance)
route.patch('/delete/performance/stage/:id',protect,deleteUserPerformanceStage)
route.patch('/delete/performance/queue/:id',protect,deleteUserPerformanceQueue)
route.patch('/delete/contestant/stage/:id',protect,resignContestantFromStage)
route.patch('/delete/contestant/queue/:id',protect, deleteContestantFromQueue)
route.patch('/delete/contestant/Elimination/:id',protect,deleteContestantFromEliminations)

//conestant post , like , vote 
route.get('/post/:id',protect,getPostById)
route.post('/likes/:id',protect,LikePost)
route.post('/votes/:id',protect,votePost)
route.post('/flags/:id',protect,flagPost)

// comments , add , delete , update , replies
route.post('/post/comment/:id',protect,addComment)
route.patch('/post/comment/:id',protect,deleteComment)




//********************************** user talents , participations  */

route.post('/findStage',protect,async(req,res)=>{
     const TalentName =  req.body.name
     const regionName =  req.body.region
     const stage = await talentModel.findOne({name:TalentName , region:regionName})
     return res.json(stage).status(200)
})


route.get('/favourites/:id',protect,async(req,res)=> {
  const user_id = req.params.id;
  let favourite = await favouriteModel.findOne( {user_id : user_id})
  return res.json(favourite).status(200)
})


route.patch('/favourite/:id',protect,async(req,res)=> {
  const user_id = req.params.id;
  let favourite = await favouriteModel.findOne(
      {user_id : user_id}    
  )
  favourite.favourites = favourite.favourites.filter(f=> f._id !== req.body.talentRoom_id )
  await favourite.save()
  return res.json(favourite).status(200)
})


//********************************************************

route.get('/top/:id',protect,async(req,res)=>{
      const user_id = req.params.id
      let userTalents = await talentModel.find();
      // userTalents = userTalents.filter( t => !(t.contestants.some(c=> c.user_id === user_id)
      // || t.queue.some(c=> c.user_id === user_id)))
      userTalents = userTalents.filter( t => t.contestants.length > 1 || t.round > 3)
      userTalents.sort((a, b) => {
           return b.editions.length  - a.editions.length
      })
      res.json(userTalents)
})


route.get('/user/performance/:id',protect,async(req,res)=>{
      const user_id = req.params.id
      const userTalents = await talentModel.find({});
      let performances = []
      userTalents.forEach( t => {
          t.editions.forEach( e => {
              let performance = null
              if(e.status == "closed" || (e.status == "open" && e.round > 4 ) ){
                if( (e.winner && e.winner.user_id == user_id )||
                   e.quarter_finalists.find( c => c.user_id == user_id ) ||
                   e.semi_finalists.find( c => c.user_id == user_id ) || 
                   e.finalist.find( c => c.user_id == user_id ) 
                   ){  
                    let cts = []
                    e.winner && cts.push(e.winner)
                    cts.push(...e.finalist)
                    cts.push(...e.semi_finalists)
                    cts.push(...e.quarter_finalists)
                    performance = {
                      _id: t._id,
                      edition_id: e._id,
                      name : t.name,
                      region : t.region,
                      status: e.status,
                      createdAt : t.createdAt,
                      updatedAt : t.updatedAt,
                      contestants : cts
                    }
                   }
              }
              if(performance) performances.push(performance)
          })
       })
      res.json(performances)
})



route.get('/user/:id',protect,async(req,res)=>{
      const user_id = req.params.id
      const talents = await talentModel.find({
        'contestants.user_id': user_id
       })
      res.json(talents)
})

//******************************** post likes, votes, comments */








// **************************** Comments ***************************

route.get('/post/comment/:id',protect,async(req,res)=> {
    const post_id = req.params.id
    let postData = await talentPostDataModel.findOne({post_id:post_id})
    return res.json(postData).status(200)
 })



//***************************** upload contestants and more */



route.patch('/queue/:id',protect,async(req,res)=>{
    console.log(req.body)
    const _id = req.params.id
    const user = req.body
    const talent = await talentModel.findById(
        _id 
    )
    let updateQuery;
    const userQued = talent.queue.find(user => user.user_id == req.body.user_id);
    if (userQued) {
        updateQuery = { $pull: { queue: user } };
      } else {
        updateQuery = { $addToSet: { queue: user } }; 
      }
    const updated = await talentModel.findByIdAndUpdate(
        _id,
         updateQuery,
        { new: true } 
      );
    return res.json(updated)
})


route.get('/room/:id',protect, async(req,res)=>{
    const room_id = req.params.id;
    const talentRoom = await talentModel.findById(room_id)
    if(!talentRoom) return res.json("post expired")
    res.json(talentRoom).status(200)
   })

route.get('/rooms',protect, async(req,res)=>{
    const { name } = req.query;
    const talentRooms = await talentModel.find({name:name})
    if(!talentRooms) return res.json("post expired")
    res.json(talentRooms).status(200)
   })


//************************* handle contestant participation and performances  */













 



   route.patch('/elimination/:id',protect, async(req,res)=>{
    const room_id = req.params.id;
    const talentRoom = await talentModel.findById(room_id)
    
    let edition = talentRoom.editions.find(e=> e.status === "open")
    if(edition.round < 4 && (talent.contestants.length < 22 || talent.queue.length <  6 ))
            return res.json(talent)

    let eliminatedContestants=[]

    if(edition.round < 4 ){
    eliminatedContestants = talentRoom.contestants.splice(-6)
    talentRoom.eliminations.push(...eliminatedContestants)
    const queuedContestants = talentRoom.queue.splice(0,6)
    talentRoom.contestants.push(...queuedContestants)
    }
    if(edition.round == 4 ){
      eliminatedContestants = talentRoom.contestants.splice(-8)
      talentRoom.eliminations.push(...eliminatedContestants)
    }
    if(edition.round == 5 ){
      eliminatedContestants = talentRoom.contestants.splice(-4)
      talentRoom.eliminations.push(...eliminatedContestants)
    }

    if(edition.round == 6 ){
      eliminatedContestants = talentRoom.contestants.splice(-2)
      talentRoom.eliminations.push(...eliminatedContestants)
    }

    if(edition.round == 7 ){
      eliminatedContestants = talentRoom.contestants.splice(-1)
      talentRoom.eliminations.push(...eliminatedContestants)
    }

    if(edition.round !== 7 ) {
      edIndex = talentRoom.editions.findIndex( e => e.status === "open")
      edition.round = edition.round + 1 
      talentRoom.editions[edIndex] = edition
        };

    eliminatedContestants.forEach(async(el)=> {
          // await talentPostDataModel.findByIdAndDelete(el._id)
          talentRoom.voters =  talentRoom.voters.filter(v=>v.post_id !== el._id)
          let   message = "you have been eliminated from  talent show"     
          const notification = {
              receiver_id:el.user_id,   
              type:"talent",
              isRead:false,
              message:message , 
              content: {  
                  sender_id:el.user_id,
                  talentRoom_id:room_id,
                  talentName:talentRoom.name,
                  name:el.name,
                  profile_img:el.profile_img,
                  region:talentRoom.region,   
              }
            
          }   
          await notificationModel(notification).save()
          
    } )

    queuedContestants.forEach(async(el)=> {
      let   message = "you have been posted in a Talent Show , you can start tracking progress"     
      const notification = {
          receiver_id:el.user_id,
          type:"talent",
          isRead:false,
          message:message , 
          content: {  
              sender_id:el.user_id,
              talentRoom_id:room_id,
              talentName:talentRoom.name,
              name:el.name,
              profile_img:el.profile_img,
              region:talentRoom.region,   
          }
      }
      await notificationModel(notification).save()
      const friend = await friendModel.findOne({user_id:el.user_id})
    
      if(friend)
            friend.friends.forEach(async(friend) =>{
              let   message = "has participated in a talent show"     
              const notification = {
                  receiver_id:friend.user_id,
                  type:"talent",
                  isRead:false,
                  message:message , 
                  content: {  
                      sender_id:el.user_id,
                      talentRoom_id:room_id,
                      talentName:talentRoom.name,
                      region:talentRoom.region, 
                      profile_img:el.profile_img,
                      name:el.name,
                      email:el.email,  
                  }
                
              }
              await notificationModel(notification).save()
              
      })
    })
    await talentRoom.save()
    res.json(talentRoom).status(201)   
   })






export default route; 