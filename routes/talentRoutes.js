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
    // if(talent.waiting_list == undefined) talent.waiting_list = [];
    if(talent.voters == undefined) talent.voters =[]
    if(talent.round == undefined) talent.round = 1;
  //   if(talent.round < 4 && (talent.queue.length < ( 4 - talent.round) * 6)) {
  //     const waitingUsers = talent.waiting_list.splice(0, ( 4 - talent.round) * 6 -talent.queue.length)
  //     talent.queue.push(...waitingUsers)
  //  }
     talent.contestants.sort((a, b) => {
                        if(a.votes !== b.votes){
                           return b.votes - a.votes
                        }else {
                           return b.likes - a.likes
                        }
                        
                        })
     await talent.save()
    //  let newT = {
    //     _id:talent._id,
    //     name:talent.name,
    //     region : talent.region,
    //     desc : talent.desc,
    //     contestants:[],
    //     queue : talent.queue,
    //     MAXCONTESTANTS: 22,
    //     eliminations : talent.eliminations
    //  }
    //  if(talent.contestants.length > 0){
    //     talent.contestants.map(async(contestant,index) => {
    //         const pData = await talentPostDataModel.findOne({post_id:contestant._id})
    //         if (pData) newT.contestants.push({...contestant,votes:pData.votes.length})
    //         else newT.contestants.push({...contestant,votes:0 })
    //         if(newT.contestants.length == talent.contestants.length){
            
    //             newT.contestants.sort((a, b) => b.votes - a.votes)
    //             return  res.json(newT)
    //         }     
              
    //     })  
    //  }     
    //  else  return 
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
      const talentRoom = await talentModel.findByIdAndUpdate(
        req.body.room_id,
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
    const talentRoom = await talentModel.findById(talentPost.room_id)
    if(updatedPost.flags.length >= 7)  {
         if(updatedPost.likes.length < updatedPost.flags.length * 10 )
         {
            talentRoom.contestants = talentRoom.contestants.filter(contestant => contestant.user_id !== owner_id)
            talentRoom.eliminations.push({user_id:owner_id})
            let userQueue = null  ;
            if(talentRoom.queue.length >0) 
                userQueue = talentRoom.queue.shift()
            userQueue && talentRoom.contestants.push(userQueue)
            await talentRoom.save()
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
             let index = talent.contestants.findIndex(c => c._id == voter.post_id) 
             let contestant = talent.contestants[index]
             contestant.votes --;
             talent.contestants[index]=contestant
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
  let postComment = await commentModel.findOne(
      {post_id:post_id 
      }
     
  )
  postComment.content = postComment.content.filter(el => el._id.toString() !== comment_id.toString())
  await postComment.save()
  return res.json(postComment).status(200)
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
    const query = req.body.type == "update" ? 
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
})


route.patch('/queue/:id',verifyJwt,async(req,res)=>{
    console.log(req.body)
    const _id = req.params.id
    const user = req.body
    const talentRoom = await talentModel.findById(
        _id 
    )
    
    let updateQuery;
    const userQued = talentRoom.queue.find(user => user.user_id == req.body.user_id);
    if (userQued) {
        updateQuery = { $pull: { queue: user } };
      } else {
        updateQuery = { $addToSet: { queue: user } }; 
      }
    const updatedRoom = await talentModel.findByIdAndUpdate(
        _id,
         updateQuery,
        { new: true } 
      );
    return res.json(updatedRoom)
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
    const deletedPost = await talentPostDataModel.findOneAndDelete({post_id:post_id})
    
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
        // talentRoom.eliminations.push({user_id:user_id})
    }
  //   if(talentRoom.round < 4 && (talentRoom.queue.length < ( 4 - talentRoom.round) * 6)) {
  //     const waitingUsers = talentRoom.waiting_list.splice(0, ( 4 - talentRoom.round) * 6 -talentRoom.queue.length)
  //     talentRoom.queue.push(waitingUsers)
  //  }
    await talentRoom.save()
    res.json(talentRoom).status(200)
   })

   route.patch('/elimination/:id',verifyJwt, async(req,res)=>{
    const room_id = req.params.id;
    const talentRoom = await talentModel.findById(room_id)
     
    if(talentRoom.round < 4 && (talentRoom.contestants.length < 22 || talentRoom.queue.length <  6 ))
            return res.json(talentRoom)

    let eliminatedContestants=[]

    if(talentRoom.round < 4 ){
    eliminatedContestants = talentRoom.contestants.splice(-6)
    talentRoom.eliminations.push(...eliminatedContestants)
    const queuedContestants = talentRoom.queue.splice(0,6)
    talentRoom.contestants.push(...queuedContestants)
    }
    if(talentRoom.round == 4 ){
      eliminatedContestants = talentRoom.contestants.splice(-8)
      talentRoom.eliminations.push(...eliminatedContestants)
    }
    if(talentRoom.round == 5 ){
      eliminatedContestants = talentRoom.contestants.splice(-4)
      talentRoom.eliminations.push(...eliminatedContestants)
    }

    if(talentRoom.round == 6 ){
      eliminatedContestants = talentRoom.contestants.splice(-2)
      talentRoom.eliminations.push(...eliminatedContestants)
    }

    if(talentRoom.round == 7 ){
      eliminatedContestants = talentRoom.contestants.splice(-1)
      talentRoom.eliminations.push(...eliminatedContestants)
    }

    if(talentRoom.round !== 7 )talentRoom.round = talentRoom.round + 1 ;

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