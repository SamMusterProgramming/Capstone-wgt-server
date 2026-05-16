import mongoose from "mongoose"
import talentModel from "../models/talent.js"
import talentPostDataModel from "../models/talentPostData.js"
import { generateTalentStage } from "./talentController.js"




export const getPostById  = async(req,res)=>{
    const post_id =  req.params.id
    const talentPost = await talentPostDataModel.findOne(
        {post_id:post_id}
        )
     if(!talentPost) 
      {
        return res.json("expired")   
      }
    return res.json(talentPost)
}

export const LikePost = async(req,res)=>{
    
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
}

export const votePost = async(req,res)=>{
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
    if(!talentPost || (!talent.contestants.find(c => c._id.toString() === post_id))
    ) { 
        await generateTalentStage(
            talent.name, 
            talent.region, 
            true
        );
        return res.json("expired")
    }
    const stage = await generateTalentStage(
        talent.name,
        talent.region, 
        )
    const post_owner_name =  stage.contestants.find(c => c._id == post_id).name || 
                             stage.queue.find(c => c._id == post_id).name 
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
           return b.votes - a.votes   
        }else {
           return b.likes - a.likes
        }   
    })
    await talentRoom.save()
    const structuredTalent =
    await generateTalentStage(
      talent.name,
      talent.region, 
      true
    );
    return res.json(talentPost)
}


export const flagPost = async(req,res)=>{
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
}


// comments , add , delete .... 

export const addComment = async(req,res)=> {
    const post_id = req.params.id.toString()
    const commentData={
          _id :new mongoose.Types.ObjectId(),
          commenter_id : req.body.commenter_id,
          profile_img:req.body.profile_img,
          name:req.body.name,
          comment:req.body.comment
        }
    let postData = await talentPostDataModel.findOne({post_id:post_id})
    postData.comments.push(commentData)
    await postData.save()
    res.json(postData).status(200)
    }   

export const  deleteComment  = async(req,res)=> {
    console.log(req.body.comment_id)
    const post_id = req.params.id;
    const comment_id = req.body.comment_id
    let post = await talentPostDataModel.findOne(
        {post_id : post_id}
    )
    post.comments = post.comments.filter(el => el._id.toString() !== comment_id.toString())
    await post.save()
    return res.json(post).status(200)   
    }
