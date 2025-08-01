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
     const TalentName =  req.body.name
     const regionName =  req.body.region
     const talent = await talentModel.findOne({name:TalentName , region:regionName})
     if(! talent) {
        const tal = new talentModel({
            name:TalentName,
            region : regionName,
            desc : req.body.desc
        })
       await tal.save()
       return res.json(tal)
     }

    if(talent.editions.length == 0)
    talent.editions.push({
          _id:1,
          round:1,
          status:"open",
          winner: null,
          createdAt : new Date(),
          updatedAt : new Date()
    })
 
    if(talent.voters == undefined) talent.voters = []
    
    talent.contestants.sort((a, b) => {
      if(a.votes !== b.votes){
         return b.votes - a.votes
      }else {
         return b.likes - a.likes
      }
      
      })
    

    // let fix = talent.contestants.splice(-3)
    // talent.eliminations.push(fix)

    let edition = talent.editions.find(e => e.status == "open")
    let edIndex = talent.editions.findIndex( e => e.status === "open")

    let queuedUsers = []
        if(edition.round < 4 && talent.contestants.length < 22 &&  talent.queue.length > 0){
          queuedUsers = talent.queue.splice(0,22-talent.contestants.length)
          talent.contestants.push(...queuedUsers)
       }


    // if(talent.eliminations.length > 0){
    //    let contest = talent.eliminations.splice(0,talent.eliminations.length)
    //    talent.queue.push(...contest)  
    // }
     
    //************************* elimination ****************/
    // let edition = talent.editions.find(e => e.status == "open")
    // let edIndex = talent.editions.findIndex( e => e.status === "open")
    if(edition && ((edition.round < 4 && talent.contestants.length >= 22 && talent.queue.length >= 6)||
     (edition.round >= 4))) {
        const roundDate = new Date(edition.updatedAt)
        const now = new Date();
        const differenceInMilliseconds = (now - roundDate)/(1000*60)
        console.log(differenceInMilliseconds)
     
        if(differenceInMilliseconds >= 1) {

          let eliminatedContestants=[]
          let queuedContestants =[]  
    
          if(edition.round < 3 ){
          eliminatedContestants = talent.contestants.splice(-6)
          talent.eliminations.push(...eliminatedContestants)
          queuedContestants = talent.queue.splice(0,6)
          talent.contestants.push(...queuedContestants)
          }

          if(edition.round == 3 ){
            eliminatedContestants = talent.contestants.splice(-6)
            talent.eliminations.push(...eliminatedContestants)
          }

          if(edition.round == 4 ){
            eliminatedContestants = talent.contestants.splice(-8)
            talent.eliminations.push(...eliminatedContestants)
           
          }
      
          if(edition.round == 5 ){
            eliminatedContestants = talent.contestants.splice(-4)
            // talent.eliminations.push(...eliminatedContestants)
            edition.quarter_finalists= eliminatedContestants
            talent.editions[edIndex] = edition

          }
      
          if(edition.round == 6 ){
            eliminatedContestants = talent.contestants.splice(-2)
            // talent.eliminations.push(...eliminatedContestants)
            edition.semi_finalists = eliminatedContestants
            talent.editions[edIndex] = edition
          }

          if(edition.round == 7 ){
            eliminatedContestants = talent.contestants.splice(-1)
            // talent.eliminations.push(...eliminatedContestants)
            edition.finalist = eliminatedContestants
            talent.editions[edIndex] = edition
          }
      
          if(edition.round !== 7 ) {
            // edIndex = talent.editions.findIndex( e => e.status === "open")
            edition.round = edition.round + 1 
            edition.updatedAt = new Date()
            talent.editions[edIndex] = edition
          } else {
            edition.round = 7
            edition.updatedAt = new Date()
            edition.status = "closed"
            edition.winner = talent.contestants[0]
            talent.editions[edIndex] = edition

            talent.queue.unshift(...edition.quarter_finalists)
            talent.queue.unshift(...edition.semi_finalists)
            talent.queue.unshift(...edition.finalist)

            let queuedUsers = talent.queue.splice(0,21)
            talent.contestants.push(...queuedUsers)

            const newEdition = {
               _id:edition._id + 1 ,
               round : 1 ,
               status : "open",
               winner : null,
               createdAt : new Date(),
               updatedAt : new Date()
            }
            talent.editions.push(newEdition)
          }
      
          eliminatedContestants.forEach(async(el)=> {
                // const post = await  talentPostDataModel.findOneAndUpdate(
                //   {post_id:el._id},
                //   { $set: { votes: [] } },
                //   { new: true } 
                // )
                // talent.voters =  talent.voters.filter(v => v.post_id !== el._id)
                let   message = "you have been eliminated from  talent show"     
                const notification = {
                    receiver_id:el.user_id,   
                    type:"talent",   
                    isRead:false,
                    message:message , 
                    content: {  
                        sender_id:el.user_id,
                        talentRoom_id:talent._id,
                        talentName:talent.name,
                        name:el.name,
                        profile_img:el.profile_img,
                        region:talent.region,   
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
                    talentRoom_id:talent._id,
                    talentName:talent.name,
                    name:el.name,
                    profile_img:el.profile_img,
                    region:talent.region,   
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
                            talentRoom_id:TalentName._id,
                            talentName:talent.name,
                            region:talent.region, 
                            profile_img:el.profile_img,
                            name:el.name,
                            email:el.email,  
                        }
                      
                    }
                    await notificationModel(notification).save()
                    
            })
      
      
          })


        }
    }







    //  talent.contestants.sort((a, b) => {
    //                     if(a.votes !== b.votes){
    //                        return b.votes - a.votes
    //                     }else {
    //                        return b.likes - a.likes
    //                     }
                        
    //                     })
     await talent.save()
     res.json(talent)   
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
      const talent = await talentModel.findByIdAndUpdate(
        req.body._id,
        {
            $set: {
              "contestants.$[item].votes":updatedPost.votes.length,
              "contestants.$[item].likes":updatedPost.likes.length,
            }
          },
          {
            arrayFilters: [{ "item.user_id": owner_id }],
            new: true 
          }
    )
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
    const talent = await talentModel.findById(talentPost.room_id)
    if(updatedPost.flags.length >= 7)  {
         if(updatedPost.likes.length < updatedPost.flags.length * 10 )
         {
            talent.contestants = talent.contestants.filter(contestant => contestant.user_id !== owner_id)
            talent.eliminations.push({user_id:owner_id})
            let userQueue = null  ;
            if(talent.queue.length > 0) 
                userQueue = talent.queue.shift()
            userQueue && talent.contestants.push(userQueue)
            await talent.save()
            // await talentPostDataModel.findOneAndDelete({post_id:post_id})
         }
    }
    return res.json(updatedPost)
})


route.post('/votes/:id',verifyJwt,async(req,res)=>{
    
    const post_id =  req.params.id
    const owner_id = req.body.owner_id
    const voter_id = req.body.voter_id

    const vote = {
       voter_id : req.body.voter_id
    }

    const talent = await talentModel.findById(req.body.room_id)
    const talentPost = await talentPostDataModel.findOne(
      {post_id:post_id}
      )
    
    const post_owner_name = talent.contestants.find(c => c._id == post_id).name
    

    if(!talentPost) { 
        return res.json("expired")
    }
    const voter = talent.voters.find(  v => 
                                    v.voter_id == voter_id
                                 )
    // let votedTalentPost = null
    // if(voter) votedTalentPost = await talentPostDataModel.findOne(
    //                {post_id:voter.post_id}
    //              )
    if(!voter){
        talent.voters.push({
                  voter_id : req.body.voter_id,
                  post_id : post_id,
                  name : post_owner_name,
                  createdAt: new Date()
        })
        talentPost.votes.push(vote)
        await talent.save()
        await talentPost.save()
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
                  {post_id:voter.post_id},
                  { $pull: { votes: vote } },
                  { new: true } 
                );
             let contestant = null
             let contestantPost = talent.contestants.find(c => c._id == voter.post_id) 
             if(contestantPost){
              let index = talent.contestants.findIndex(c => c._id == voter.post_id) 
              let contestant = talent.contestants[index]
              contestant.votes --;
              talent.contestants[index]=contestant   
             }else{
              contestantPost = talent.queue.find(c => c._id == voter.post_id) 
                  if(contestantPost){
                    let index = talent.queue.findIndex(c => c._id == voter.post_id) 
                    let contestant = talent.queue[index]
                    contestant.votes --;
                    talent.queue[index]=contestant   
                  }else{
                    contestantPost = talent.eliminations.find(c => c._id == voter.post_id) 
                    if(contestantPost){
                      let index = talent.eliminations.findIndex(c => c._id == voter.post_id) 
                      let contestant = talent.eliminations[index]
                      contestant.votes --;
                      talent.eliminations[index]=contestant   
                    }
                  }
             }
            
        }else{
            talentPost.votes = talentPost.votes.filter(v => v.voter_id !== voter_id )
            }
        }

    await talent.save()
    await talentPost.save()
    


    // const talentPost = await talentPostDataModel.findOne(
    //     {post_id:post_id}
    //     )
  //   if(! talentPost) { 
  //     return res.json("expired")
  // }
 
    
    // let updateQuery;
    // const userLiked = talentPost.votes.find(vote => vote.voter_id == req.body.voter_id);
    // if (userLiked) {
    //     updateQuery = { $pull: { votes: vote } };
    //   } else {
    //     updateQuery = { $addToSet: { votes: vote } }; // $addToSet ensures unique entries
    //   }
    // const updatedPost = await talentPostDataModel.findOneAndUpdate(
    //     {post_id:post_id},
    //      updateQuery,
    //     { new: true } 
    //   );



    
    const talentRoom = await talentModel.findByIdAndUpdate(
        req.body.room_id,
        {
            $set: {
              "contestants.$[item].votes":talentPost.votes.length,
              "contestants.$[item].likes":talentPost.likes.length,
            }
          },
          {
            arrayFilters: [{ "item.user_id": owner_id }],
            new: true 
          }
    )

    talentRoom.contestants.sort((a, b) => {
        if(a.votes !== b.votes){
            b.votes - a.votes
        }else {
            b.likes - a.likes
        }
        
        })
    await talentRoom.save()
    
    return res.json(talentPost)
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
  let post = await talentPostDataModel.findOne(
    {post_id : post_id}
  )
  console.log(post.comments)
  post.comments = post.comments.filter(el => el._id.toString() !== comment_id.toString())
  await post.save()
  return res.json(post).status(200)
})

//***************************** upload contestants and more */

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
             votes:0,
             likes:0,
             thumbNail_URL: req.body.thumbNail,
             talentRoom_id: req.body.room_id,
             createdAt: new Date()
            }  
    // const query = req.body.type =="new" ? 
    // {$push: { contestants : contestant }}
    // : {$push: { queue : contestant }}

    // const newTalent = await talentModel.findByIdAndUpdate(
    //     _id,
    //      query
    //      ,
    //      { new:true } 
    // )

    const newTalent = await talentModel.findById(_id)
    
     if(req.body.type =="new") {
            if(newTalent.contestants.length <22){
              newTalent.contestants.push(contestant)
            }else{
              // if(newTalent.queue.length < (4 - newTalent.round) * 6)
               newTalent.queue.push(contestant)
              // else newTalent.waiting_list.push(contestant)
            }
     }else{
          // if(newTalent.queue.length < (4 - newTalent.round) * 6)
            newTalent.queue.push(contestant)
          // else newTalent.waiting_list.push(contestant)
     }
    await newTalent.save()

    const newPostData = new talentPostDataModel(
         {
          post_id : newObjectId,
          owner_id : req.body.user_id,
          room_id:req.body.room_id,
          likes:[],
          votes:[],
          flags:[],
          comments:[]
         })
    await newPostData.save()

    const friend = await friendModel.findOne({user_id:req.body.user_id})
    
    if(req.body.type == "new"){
        if(friend)
          friend.friends.forEach(async(friend) =>{
          
            let   message = "has participated in a talent show"     
            const notification = {
                receiver_id:friend.user_id,
                type:"talent",
                isRead:false,
                message:message , 
                content: {  
                    sender_id:req.body.user_id,
                    talentRoom_id:_id,
                    talentName:newTalent.name,
                    region:newTalent.region, 
                    profile_img:req.body.profile_img,
                    name:req.body.name,
                    email:req.body.email,  
                }
              
            }
            await notificationModel(notification).save()
            
        })
        newTalent.contestants.forEach(async(c)=>{
              if(req.body.user_id !== c.user_id && !friend.friends.find(f=> f.user_id == c.user_id)){
                let   message = "has participated in  the Talent Contest you are posted in"     
                const notification = {
                  receiver_id:c.user_id,
                  type:"talent",
                  isRead:false,
                  message:message , 
                  content: {  
                      sender_id:req.body.user_id,
                      talentRoom_id:_id,
                      talentName:newTalent.name,
                      region:newTalent.region, 
                      profile_img:req.body.profile_img,
                      name:req.body.name,
                      email:req.body.email,  
                  }
                
              }

              await notificationModel(notification).save()
            }
        })
   }

    if(!newTalent) return res.json({error:"expired"}).status(404)
    res.json(newTalent)
})

route.patch('/update/:id',verifyJwt,async(req,res)=>{
    const _id = req.params.id

    if(req.body.type !== "eupdate"){
    const query =  req.body.type == "update" ? 
    {
        $set: {
          "contestants.$[item].name": req.body.name,
          "contestants.$[item].profile_img": req.body.profile_img,
          "contestants.$[item].thumbNail_URL": req.body.thumbNail,
          "contestants.$[item].country":req.body.country,
          "contestants.$[item].video_url":req.body.video_url,
        }
      }:
      {
        $set: {
          "queue.$[item].name": req.body.name,
          "queue.$[item].profile_img": req.body.profile_img,
          "queue.$[item].thumbNail_URL": req.body.thumbNail,
          "queue.$[item].country":req.body.country,
          "queue.$[item].video_url":req.body.video_url,
        }
      }
    const newTalent = await talentModel.findByIdAndUpdate(
        _id ,
        query,
          {
            arrayFilters: [{ "item.user_id": req.body.user_id }],
            new: true 
          }
    )

   


   if(req.body.type =="update"){

    const friend = await friendModel.findOne({receiver_id:req.body.user_id})

    if(friend)
      friend.friends.forEach(async(friend) =>{
        let   message = "has updated his participation in a talent show"     
        const notification = {
            receiver_id:friend.user_id,
            type:"talent",
            isRead:false,
            message:message, 
            content: {  
                sender_id:req.body.user_id,
                talentRoom_id:_id,
                talentName:newTalent.name,
                region:newTalent.region, 
                profile_img:req.body.profile_img,
                name:req.body.name,
                email:req.body.email,  
            }
          
        }

        await notificationModel(notification).save()
     })
    
     newTalent.contestants.forEach(async(c)=>{
      if(req.body.user_id !== c.user_id && !friend.friends.find(f => f.user_id == c.user_id)){
        let   message = "has updated his post in the Talent Contest you are posted in"     
        const notification = {
          receiver_id:c.user_id,
          type:"talent",
          isRead:false,
          message:message , 
          content: {  
              sender_id:req.body.user_id,
              talentRoom_id:_id,
              talentName:newTalent.name,
              region:newTalent.region, 
              profile_img:req.body.profile_img,
              name:req.body.name,
              email:req.body.email,  
          }
        
      }

      await notificationModel(notification).save()
    }
    })
     
    }

    if(!newTalent) return res.json({error:"expired"}).status(404)
    res.json(newTalent)

  }else {
       const talent = await talentModel.findById(_id)
       if(!talent) return res.json({error:"expired"}).status(404)
       const index = talent.eliminations.findIndex( e => e.user_id == req.body.user_id)
       if(index !== -1) {
       const eliminatedContestant = talent.eliminations.splice(index,1)
       let contestant = eliminatedContestant[0]
       contestant.video_url = req.body.video_url
       contestant.thumbNail_URL = req.body.thumbNail
       talent.queue.push(contestant)
       await talent.save()
        }
       res.json(talent)
  } 
})


route.patch('/queue/:id',verifyJwt,async(req,res)=>{
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
    const type = req.body.type
    const talentRoom = await talentModel.findById(room_id)
    if(!talentRoom) return res.json("expired")
    
    if(type == "resign"){
        const deletedUser = talentRoom.contestants.find(c => c.user_id == user_id)
        talentRoom.contestants = talentRoom.contestants.filter(contestant => contestant.user_id !== user_id)
        talentRoom.voters =  talentRoom.voters.filter(v=>v.post_id !== post_id)
        deletedUser && talentRoom.eliminations.push(deletedUser)
        let   message = "you have been eliminated from  talent show"     
        const notification = {
              receiver_id:user_id,
              type:"talent",
              isRead:false,
              message:message , 
              content: {  
                   sender_id:user_id,
                   talentRoom_id:room_id,
                   talentName:talentRoom.name,
                   name:"Admin",
                   profile_img:"admin",
                   region:talentRoom.region,   
                 } 
          }
        await notificationModel(notification).save()
        let userQueue = null ; 
        if(talentRoom.contestants.length < 22 &&  talentRoom.queue.length > 0)
               userQueue = talentRoom.queue.shift()
        if(userQueue) {
         talentRoom.contestants.push(userQueue)
         let   message = "your partiicipation has been posted in the talent contest"     
         await notificationModel({
                  receiver_id:userQueue.user_id,
                  type:"talent",
                  isRead:false,
                  message:message , 
                  content: {  
                      sender_id:userQueue.user_id,
                      talentRoom_id:room_id,
                      talentName:talentRoom.name,
                      name:userQueue.name,
                      profile_img:userQueue.profile_img,
                      region:talentRoom.region,   
                    }
                }).save()
        }
        
    }
    if(type == "queued"){
        talentRoom.queue = talentRoom.queue.filter(u => u.user_id !== user_id)
        talentRoom.voters =  talentRoom.voters.filter(v => v.post_id !== post_id)
        await talentPostDataModel.findOneAndDelete({post_id:post_id})
    }
    if(type == "eliminated"){
      talentRoom.eliminations = talentRoom.eliminations.filter(u => u.user_id !== user_id)
      talentRoom.voters =  talentRoom.voters.filter(v => v.post_id !== post_id)
      await talentPostDataModel.findOneAndDelete({post_id:post_id})
  }
  //   if(talent.round < 4 && (talent.queue.length < ( 4 - talent.round) * 6)) {
  //     const waitingUsers = talent.waiting_list.splice(0, ( 4 - talent.round) * 6 -talent.queue.length)
  //     talent.queue.push(waitingUsers)
  //  }
    await talentRoom.save()
    res.json(talentRoom).status(200)
   })



   route.patch('/elimination/:id',verifyJwt, async(req,res)=>{
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