const express = require('express')
const {ObjectId} = require('mongodb')
const commentModel = require('../models/comments.js')
const challengeModel = require('../models/challenge.js')
const data = require('../utilities/data.js')
const upload = require('../multer.js')
const likeModel = require ('../models/likes.js')
const mongoose = require('mongoose')
const followerModel = require('../models/followers.js')

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


// create new challenge
route.post('/upload',upload.single('video'),async(req,res)=>{
    console.log('I am here')
    if(!req.file){
        return res.status(400).send('no file to upload')
    }
    const newObjectId = new mongoose.Types.ObjectId();
    const timeLapse = Date.now();
    const challenge = {
        origin_id:req.body.origin_id,
        video_url:"/static/videos/" + req.file.originalname,
        desc: req.body.description,
        category : "eating context",
        like_count:0,    
        
        participants:[{
             _id: newObjectId,
             user_id:req.body.origin_id ,
             video_url:"/static/videos/" + req.file.originalname,
             likes:0,
             votes:0,
             profile_img:req.body.profile_img,
             name:req.body.name,
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
    res.json( newChallenge)
})

route.post('/upload/:id',validateMongoObjectId,upload.single('video'),async(req,res)=>{
    console.log('challeging a challenger')
    if(!req.file){
        return res.status(400).send('no file to upload')
    }
    const newObjectId = new mongoose.Types.ObjectId();
    const _id = req.params.id
    const participant = {
        // origin_id:req.body.origin_id,
        // video_url:"/static/videos/" + req.file.originalname,
        // desc: req.body.description,
        // category : "eating context",
        // like_count:0,
             _id: newObjectId,
             user_id:req.body.user_id ,
             video_url:"/static/videos/" + req.file.originalname,
             likes:0,
             votes:0,
             profile_img:req.body.profile_img,
             name:req.body.name
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

route.get('/:id',async(req,res)=> {
    const origin_id = req.params.id;
    const challenges = await challengeModel.find({origin_id:origin_id})
    const ch = await challengeModel.find({
        participants:{$elemMatch: {user_id:req.params.id }}
    })
    res.json(ch)   
})
   
// find any other challenges that don't include the user
route.get('/top/:id',validateMongoObjectId,async(req,res)=> {
    const idToExclude = req.params.id;
    console.log(idToExclude)
    const challenges = await challengeModel.find({ origin_id: { $ne: idToExclude } })
    res.json(challenges).status(200)  
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
        console.log(query) 

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
        console.log(challenge.participants[elementIndex].likes)
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
            console.log(query)
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
        console.log("i am here")
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
                console.log(participant)
            exist = await likeModel.findOne({user_id:query.user_id,post_id:participant._id})
            console.log(exist)
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
         







route.route('/')
    .get(async(req,res)=> { // get all posts for all Posts
        const posts = await postModel.find({}).limit(20)
        if(!posts) return res.json({error:"posts list is empty"})
        res.json(posts).status(200)
    })
    .post(validatePostData,async(req,res)=>{ 
        const comment =  new commentModel(// for each post , I create a welcome message from the admin 
               {
                user_id:req.body.user_id,
                post_id:req.body.id, 
                content:[{source_id:0,comment:"I am your Admin, Welcome"}] 
              })
        await comment.save()
        const post = req.body
        post["comments"] = [comment.content[0]] // i created and initialised template comment for the new post
        const newPost = new postModel(post)
        if(! newPost) return res.json({error:"can't create the Post"})
        await newPost.save() 
        res.json(newPost)  
    })
async function validatePostData(req,res,next) {
    if(!req.body.id || !req.body.user_id)
       return res.status(404).json({error:"invalid data"}) // we don't want to save post without required fields id and user_id
    const post = await postModel.findOne({id:req.body.id})
       if(post) return res.status(404).json({error:"ID exist or invalid"}) // id is unique for each post

    next()
}  






//access and manages all posts of user X , user_id as a params

route.route('/user/:id')
     .get(async(req,res)=>{
       const query = {user_id:req.params.id};
       const posts = await postModel.find(query)
       if(posts.length == 0) return res.json({error:"user does't have posts yet"}).status(404)
       res.json(posts).status(200)
     })
     .delete(async(req,res)=>{
        const query = {user_id:req.params.id};
        const posts = await postModel.deleteMany(query,{ new: true } )
        if(posts.length == 0 ) return res.json({error:"user does't have posts yet"}).status(404)
        res.json(posts).status(200)
      })
     

// get , delete and update a user post by user_id as paramas and post id as a query

route.route('/user/post/:id')
     .get(async(req,res)=>{
        const query = {user_id:req.params.id,id:req.query.id}
        const post = await postModel.findOne(query)
        if(!post) return res.json({error:"can't find the post"}).status(404) 
        res.status(200).json(post)
     })
     .delete(async(req,res)=>{
        const query = {user_id:req.params.id,id:req.query.id}
        const post = await postModel.deleteOne(
            query,
            { new: true } 
            )
        if(!post) return res.json({error:"can't find the post"}).status(404) 
        res.status(200).json(post)
     })
     .patch(async(req,res)=>{
        if(req.body.id || req.body.user_id) return res.json({error:"can't modify Ids, forbidden"}).status(404)
        const query = {user_id:req.params.id,id:req.query.id}
        const post = await postModel.updateOne(
            query,
            req.body,
            { new: true } 
            )
        if(!post) return res.json({error:"can't find the post"}).status(404) 
        res.status(200).json(post)
     })


 // add comment to post from user X  , paramas refer to user the owner of the post
 //req.body will contain the user who comments source_id and a content of the comment
route.patch('/comments/add/:id',async(req,res)=>{
    const query = { user_id:Number(req.params.id) ,post_id:Number(req.query.post_id)}
    if(!req.body.source_id || !req.body.content) 
        return res.status(404).json({error:"Invalid request , make sure you send source_id and content"})
    const comment = req.body; //must have source id (the user who commented with comment content)
    const post = await postModel.findOne({user_id:req.params.id,id:req.query.post_id})
    if (!post) return res.status(404).send('Post not found');
    const newComment = await commentModel.findOneAndUpdate(
        query,  
        {
            $push: { content : comment }
         },
         { new:true } 
        )   
    post.comments.push(comment) 
    await post.save();
    res.json(post).status(201) 
})   

// get all comments of a post 
route.get('/comments/all/:id',validateMongoObjectId,async(req,res)=> {
   const _id = req.params.id ; 
   const post = await postModel.findById(_id)
   if (!post) return res.status(404).send('Post not found');
   res.json(post.comments) 
})
//delete all comments of post
route.delete('/comments/delete/:id',validateMongoObjectId,async(req,res)=> {
    const _id = req.params.id ; 
    const post = await postModel.findByIdAndUpdate(
        _id,
        { $set: { comments: [] } },
      { new: true }
        )
    if (!post) return res.status(404).send('Post not found');
    res.json(post) 
 })


// middleware to validate mongo objectId _id
function validateMongoObjectId(req,res,next) {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({Error:"error in request ID"});
    next()
}    


module.exports = route; 