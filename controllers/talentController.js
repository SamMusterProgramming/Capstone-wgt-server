import mongoose from "mongoose";
import talentModel from "../models/talent.js"
import notificationModel from "../models/notifications.js";
import favouriteModel from "../models/favourites.js";
import friendModel from "../models/friends.js";
import { deleteFileFromB2_Private, deleteFileFromB2_Public, getPublicUrlFromB2, getSignedUrlFromB2 } from "../utilities/blackBlazeb2.js";
import talentPostDataModel from "../models/talentPostData.js";


export const generateTalentStage = async (name, region) => {

    const result = await talentModel.aggregate([
  
      {
        $match: {
          name,
          region
        }
      },
  
      // =======================
      // LOOKUP ALL USERS ONCE
      // =======================
      {
        $lookup: {
          from: "users",
          localField: "contestants.user_id",
          foreignField: "_id",
          as: "contestantUsers"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "queue.user_id",
          foreignField: "_id",
          as: "queueUsers"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "eliminations.user_id",
          foreignField: "_id",
          as: "eliminationUsers"
        }
      },
  
      // =======================
      // SAFE MAPPER FUNCTION (contestants)
      // =======================
      {
        $addFields: {
  
          // -------- CONTESTANTS --------
          contestants: {
            $map: {
              input: "$contestants",
              as: "contestant",
              in: {
                $let: {
                  vars: {
                    matchedUser: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$contestantUsers",
                            as: "user",
                            cond: {
                              $eq: ["$$user._id", "$$contestant.user_id"]
                            }
                          }
                        },
                        0
                      ]
                    }
                  },
  
                  in: {
                    _id: "$$contestant._id",
                    user_id: "$$contestant.user_id",
                    performances: "$$contestant.performances",
                    votes: "$$contestant.votes",
                    likes: "$$contestant.likes",
                    rank: "$$contestant.rank",
                    createdAt: "$$contestant.createdAt",
  
                    name: "$$matchedUser.name",
                    profileImage: "$$matchedUser.profileImage",
                    coverImage: "$$matchedUser.coverImage",
                    country: "$$matchedUser.country",
                    city: "$$matchedUser.city",
                    state: "$$matchedUser.state"
                  }
                }
              }
            }
          },
  
         // -------- QUEUE --------
            queue: {
                $map: {
                input: "$queue",
                as: "q",
                in: {
                    $let: {
                    vars: {
                        matchedUser: {
                        $arrayElemAt: [
                            {
                            $filter: {
                                input: "$queueUsers",
                                as: "user",
                                cond: {
                                $eq: ["$$user._id", "$$q.user_id"]
                                }
                            }
                            },
                            0
                        ]
                        }
                    },
            
                    in: {
                        _id: "$$q._id",
                        user_id: "$$q.user_id",
            
                        performances: "$$q.performances",
            
                        votes: "$$q.votes",
                        likes: "$$q.likes",
                        rank: "$$q.rank",
            
                        createdAt: "$$q.createdAt",
            
                        name: "$$matchedUser.name",
                        profileImage: "$$matchedUser.profileImage",
                        coverImage: "$$matchedUser.coverImage",
                        country: "$$matchedUser.country",
                        city: "$$matchedUser.city",
                        state: "$$matchedUser.state"
                    }
                    }
                }
                }
            },
  
          // -------- ELIMINATIONS --------
            eliminations: {
                $map: {
                input: "$eliminations",
                as: "e",
                in: {
                    $let: {
                    vars: {
                        matchedUser: {
                        $arrayElemAt: [
                            {
                            $filter: {
                                input: "$eliminationUsers",
                                as: "user",
                                cond: {
                                $eq: ["$$user._id", "$$e.user_id"]
                                }
                            }
                            },
                            0
                        ]
                        }
                    },
            
                    in: {
                        _id: "$$e._id",
                        user_id: "$$e.user_id",
            
                        performances: "$$e.performances",
            
                        votes: "$$e.votes",
                        likes: "$$e.likes",
                        rank: "$$e.rank",
            
                        createdAt: "$$e.createdAt",
            
                        name: "$$matchedUser.name",
                        profileImage: "$$matchedUser.profileImage",
                        coverImage: "$$matchedUser.coverImage",
                        country: "$$matchedUser.country",
                        city: "$$matchedUser.city",
                        state: "$$matchedUser.state"
                    }
                    }
                }
                }
            },
  
        }
      },
  
      // =======================
      // CLEANUP
      // =======================
      {
        $project: {
          contestantUsers: 0,
          queueUsers: 0,
          eliminationUsers: 0
        }
      }
  
    ]);
    return result[0];
  };



export const createTalentStage =  async(req,res)=>{
    const TalentName =  req.body.name
    const regionName =  req.body.region
    const t = await talentModel.findOne({ name: TalentName, region: regionName });
    if (!t.editions) {
        t.editions = [];
      }
      
      if (t.editions.length === 0) {
        t.editions.push({
          _id: 1,
          round: 1,
          status: "open",
          winner: null,
          finalist: [],
          semi_finalists: [],
          quarter_finalists: [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    await t.save()
    const talent = await generateTalentStage(TalentName, regionName)
    talent.contestants?.sort((a, b) => {
     if(a.votes !== b.votes){
        return b.votes - a.votes
     }else {
        return b.likes - a.likes
     }
     })
     talent.contestants.forEach((c, index) => {
        c.rank = index + 1;
     });
   
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
   //    let contest = talent.eliminations.splice(0,6)
   //    talent.queue.push(...contest)  
   // }

   //************************* elimination ****************/
   // let edition = talent.editions.find(e => e.status == "open")
   // let edIndex = talent.editions.findIndex( e => e.status === "open")
   if(edition && ((edition.round < 3 && talent.contestants.length >= 22 && talent.queue.length >= 6)||
    (edition.round >= 3 ))) {
       const roundDate = new Date(edition.updatedAt)
       const now = new Date();
       const differenceInMilliseconds = (now - roundDate)/(1000*60000)

       if(differenceInMilliseconds >= 100) {
              
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
              finalist:[],
              semi_finalists: [],
              quarter_finalists: [],
              createdAt : new Date(),
              updatedAt : new Date()
           }
           talent.editions.push(newEdition)
         }
     
         eliminatedContestants.forEach(async(el)=> {
            
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
    // await talent.save()
    res.json(talent)   
}



/// stages 

export const getStagesByRegion = async (req, res) => {
    try {
      const { region } = req.params;
      // const normalizedRegion =
      // region.slice(1).toLowerCase();
      const normalizedCountry = region.length == 2 ? region.toUpperCase() : region;
      const stages = await talentModel.find({
        region: normalizedCountry,
      }).sort({ createdAt: -1 });
      const stageNames= [
        "Singing" ,
        "Dancing",
        "Fitness",
        'Magic',
        "Sport",
        "Melody",
        "Art",
        "Comedy",
      ];
      // Instrumental
      stageNames.forEach( async(name) =>{
          if(!stages.find( s => s.name === name)){
            const tal = new talentModel({
            name:name,  
            region : region,
            desc : ""
            })
          await tal.save()
        }
      } )
  
      return res.status(200).json(stages);
  
    } catch (error) {
      console.error("Error fetching region stages:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching region stages",
      });
    }
  }

  export const getAllStages = async(req,res)=> {
    const stages = await talentModel.find({}).limit(60);  
    return res.json(stages).status(200)
  }




  // get stages where a user is hero , participatant , queued , eliminiated 
  
  export const getUserContestantInStage = async(req,res)=>{
    const user_id = req.params.id
    let userTalents = await talentModel.find({
      $or: [
        {  'contestants.user_id':  user_id
          }, 
        {  'queue.user_id': user_id
          
          }, 
        {  'eliminations.user_id': user_id             
          }
      ]
     });
    userTalents = userTalents.filter(t => t.contestants.length !== 0)
    res.json(userTalents)
}

  export const getHotStages = async(req,res)=>{
    const user_id = req.params.id
  
    // let friendIDS = []
    // friends && friends.friends.forEach(f => friendIDS.push(f.user_id))
    const talents = await talentModel.find({
                // 'contestants.user_id': { $in: friendIDS }
               })
              
    res.json(talents)
}





  //favourites
  export const getFavouriteStages = async (req, res) => {
    try {
      const user_id = req.params.id;
      const favourite = await favouriteModel.findOne({ user_id });
      if (!favourite || !favourite.favourites?.length) {
        return res.status(200).json([]);
      }
      const sortedFavorites = [...favourite.favourites].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      const ids = [...new Set(
        sortedFavorites.map(f => f._id.toString())
      )];
      const talentRooms = await talentModel.find({
        _id: { $in: ids }
      }).lean();
  
      const map = new Map(
        talentRooms.map(room => [room._id.toString(), room])
      );
      const favourites = ids
        .map(id => map.get(id))
        .filter(Boolean);
  
      return res.status(200).json(favourites);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  
  export const addFavouriteStage = async(req,res)=> {
    const user_id = req.params.id;
    const talent = await talentModel.findById(
        req.body.talentRoom_id 
       )
    let favourite = await favouriteModel.findOne(
        {user_id:user_id } 
    )
    if(!favourite)  {
        const newFavourite = new favouriteModel({
            user_id:user_id,
            favourites:[{
                       _id:req.body.talentRoom_id , 
                       dataType:"talent",
                       createdAt : new Date()
                       }]
        } 
        )
        await newFavourite.save()
        return res.json(newFavourite)
    }
    favourite.favourites.push({
                                _id:req.body.talentRoom_id ,
                                 dataType:"talent",
                                 createdAt : new Date()
                                })
    await favourite.save()
    return res.json(favourite).status(200)
  }

  // user performances

  export const joinStageOrQueueFirstPerformance =  async (req, res) => {

    try {
  
      const stage_id = req.params.id;
  
      const {
        user_id,
        room_id,
        type,
  
        videoFileName,
        videoFileId,
  
        thumbnailFileName,
        thumbnailFileId,
  
        profile_img,
        name,
        email,
      } = req.body;
  
      // =========================
      // VALIDATION
      // =========================
  
      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        return res.status(400).json({
          error: "Invalid user_id"
        });
      }
  
      if (!mongoose.Types.ObjectId.isValid(stage_id)) {
        return res.status(400).json({
          error: "Invalid stage_id"
        });
      }
  
      // =========================
      // GENERATE URLS
      // =========================
  
      const thumbnailSignedUrl =
        await getPublicUrlFromB2(thumbnailFileName);
  
      const thumbNailCdnUrl =
        thumbnailSignedUrl.replace(
          "https://f005.backblazeb2.com",
          "https://cdn.challenmemey.com"
        );
  
      const signedUrl =
        await getSignedUrlFromB2(videoFileName);
  
      const cdnUrl =
        signedUrl.replace(
          "https://f005.backblazeb2.com",
          "https://cdn.challenmemey.com"
        );
  
      // =========================
      // FIND STAGE
      // =========================
  
      const talent =
        await talentModel.findById(stage_id);
  
      if (!talent) {
        return res.status(404).json({
          error: "Talent stage expired"
        });
      }
  
      // =========================
      // PERFORMANCE OBJECT
      // =========================
  
      const performance = {
        video: {
          fileId: videoFileId,
          fileName: videoFileName,
          signedUrl,
          cdnUrl,
        },
  
        thumbnail: {
          fileId: thumbnailFileId,
          fileName: thumbnailFileName,
          publicUrl: thumbNailCdnUrl,
        },
  
        date: new Date(),
      };
  
      // =========================
      // FIND EXISTING CONTESTANT
      // =========================
  
      const existingContestant =
        talent.contestants.find(
          c =>
            c.user_id?.toString() ===
            user_id
        );
  
      const existingQueuedContestant =
        talent.queue.find(
          c =>
            c.user_id?.toString() ===
            user_id
        );
  
      // =========================
      // NEW CONTESTANT
      // =========================
      const contestant = {
        _id: new mongoose.Types.ObjectId(),
        user_id:
          new mongoose.Types.ObjectId(user_id),
        votes: 0,
        likes: 0,
        rank: 0,
        createdAt: new Date(),
        performances: [performance],
      };

      if (type === "new") {
        // avoid duplicates
        if (
          existingContestant ||
          existingQueuedContestant
        ) {
          return res.status(400).json({
            error: "Contestant already exists"
          });
        }
  
        // stage has room
        if (talent.contestants.length < 22) {
          talent.contestants.push(contestant);
          // ranking
          talent.contestants.sort((a, b) => {
            if (a.votes !== b.votes) {
              return b.votes - a.votes;
            }
            return b.likes - a.likes;
          });
          talent.contestants.forEach((c, index) => {
            c.rank = index + 1;
          });
        } else {
          // push to queue
          talent.queue.push(contestant);
        }
      
      }

      else {

        talent.queue.push(contestant);
      }
      await talent.save();

      const newPostData =
      new talentPostDataModel({
        post_id: contestant._id,
        owner_id:user_id,
        room_id:room_id,
        likes: [],
        votes: [],
        flags: [],
        comments: [],
      });
      await newPostData.save();

      if (type === "new") {
        const friend =
          await friendModel.findOne({
            user_id:
              new mongoose.Types.ObjectId(user_id)
          });
        // notify friends
        if (friend?.friends?.length) {
          for (const friendId of friend.friends) {
            const notification = {
              receiver_id: friendId,
              type: "talent",
              stage: talent.name,
              isRead: false,
              message:
                "has participated in a talent show",
              content: {
                sender_id: user_id,
                talentRoom_id: stage_id,
                talentName: talent.name,
                region: talent.region,
                profile_img,
                name,
                email,
              }
            };
            await new notificationModel(
              notification
            ).save();
          }
        }
        // notify contestants
        for (const c of talent.contestants) {
          if (
            c.user_id?.toString() !==
            user_id.toString()
          ) {
            const isFriend =
              friend?.friends?.find(
                f =>
                  f.toString() ===
                  c.user_id?.toString()
              );
            if (!isFriend) {
              const notification = {
                receiver_id:
                  c.user_id.toString(),
                type: "talent",
                isRead: false,
                message:
                  "has participated in the Talent Contest you are posted in",
                content: {
                  sender_id: user_id,
                  talentRoom_id: stage_id,
                  talentName: talent.name,
                  region: talent.region,
                  profile_img,
                  name,
                  email,
                }
              };
  
              await new notificationModel(
                notification
              ).save();
            }
          }
        }
      }
      // =========================
      // RETURN STRUCTURED STAGE
      // =========================
      const structuredTalent =
        await generateTalentStage(
          talent.name,
          talent.region
        );
      return res.status(200).json(
        structuredTalent
      );
    } catch (err) {
      console.error(
        "Upload error:",
        err
      );
  
      return res.status(500).json({
        error:
          "Failed to upload contestant"
      });
    }
  }




  export const resignContestantFromStage =  async (req, res) => {
    try {
      const room_id = req.params.id;
      const { user_id, post_id } = req.body;
      // =========================
      // VALIDATION
      // =========================
      if (!mongoose.Types.ObjectId.isValid(room_id)) {
        return res.status(400).json({
          error: "Invalid room id"
        });
      }
      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        return res.status(400).json({
          error: "Invalid user id"
        });
      }
      // =========================
      // FIND TALENT ROOM
      // =========================
      const talentRoom =
        await talentModel.findById(room_id);

      if (!talentRoom) {
        return res.status(404).json({
          error: "Talent room expired"
        });
      }
      // =========================
      // FIND CONTESTANT
      // =========================
      const contestantIndex =
        talentRoom.contestants.findIndex(
          c =>
            c.user_id?.toString() ===
            user_id.toString()
        );
      if (contestantIndex === -1) {
        return res.status(404).json({
          error: "Contestant not found"
        });
      }
      const deletedContestant =
        talentRoom.contestants[
          contestantIndex
        ];
      // =========================
      // REMOVE CONTESTANT
      // =========================
      talentRoom.contestants.splice(
        contestantIndex,
        1
      );
      // =========================
      // REMOVE VOTES
      // =========================
      if (post_id) {
        talentRoom.voters =
          talentRoom.voters.filter(
            v =>
              v.post_id?.toString() !==
              post_id.toString()
          );
      }
      // =========================
      // MOVE TO ELIMINATIONS
      // =========================
      talentRoom.eliminations.push(
        deletedContestant
      );
      // =========================
      // RECALCULATE RANKS
      // =========================
      talentRoom.contestants.sort(
        (a, b) => {

          if (a.votes !== b.votes) {
            return b.votes - a.votes;
          }

          return b.likes - a.likes;
        }
      );
      talentRoom.contestants.forEach(
        (c, index) => {
          c.rank = index + 1;
        }
      );
      // =========================
      // NOTIFY RESIGNED USER
      // =========================
      await new notificationModel({
        receiver_id: user_id,
        type: "talent",
        isRead: false,
        message:
          "you have been eliminated from talent show",
        content: {
          sender_id: user_id,
          talentRoom_id: room_id,
          talentName: talentRoom.name,
          name: "Admin",
          profile_img: "admin",
          region: talentRoom.region,
        }
      }).save();
      // =========================
      // MOVE QUEUED USER
      // =========================
      let queuedContestant = null;
      if (
        talentRoom.contestants.length < 22 &&
        talentRoom.queue.length > 0
      ) {
        queuedContestant =
          talentRoom.queue.shift();
        talentRoom.contestants.push(
          queuedContestant
        );
        // rerank again
        talentRoom.contestants.sort(
          (a, b) => {
            if (a.votes !== b.votes) {
              return b.votes - a.votes;
            }
            return b.likes - a.likes;
          }
        );
        talentRoom.contestants.forEach(
          (c, index) => {
            c.rank = index + 1;
          }
        );
        // notification
        await new notificationModel({
          receiver_id:
            queuedContestant.user_id.toString(),
          type: "talent",
          isRead: false,
          message:
            "your participation has been posted in the talent contest",
          content: {
            sender_id:
              queuedContestant.user_id.toString(),
            talentRoom_id: room_id,
            talentName:
              talentRoom.name,
            region:
              talentRoom.region,
          }

        }).save();
      }
      // =========================
      // SAVE
      // =========================
      talentRoom.markModified(
        "contestants"
      );
      talentRoom.markModified(
        "eliminations"
      );
      talentRoom.markModified(
        "queue"
      );
      await talentRoom.save();

      // =========================
      // RETURN STRUCTURED DATA
      // =========================
      const structuredTalent =
      await generateTalentStage(
          talentRoom.name,
          talentRoom.region
        );
      return res
        .status(200)
        .json(structuredTalent);

    } catch (err) {
      console.error(
        "Delete contestant error:",
        err
      );
      return res.status(500).json({
        error:
          "Failed to remove contestant"
      });
    }
  }

  export const deleteContestantFromQueue = async(req,res)=>{
    const room_id = req.params.id;
    const user_id = req.body.user_id;
    const post_id = req.body.post_id;

    const talentRoom = await talentModel.findById(room_id)
    if(!talentRoom) return res.json("expired")
    const deletedContestant = talentRoom.queue.find(c => c.user_id.toString() == user_id)
    talentRoom.queue = talentRoom.queue.filter(u => u.user_id.toString() !== user_id)
    talentRoom.voters =  talentRoom.voters.filter(v => v.post_id !== post_id)
    deletedContestant.performances.forEach(async(p) => {
          const file = []
          if (p.video?.fileId) {
            file.push(
              deleteFileFromB2_Private(
                p.video.fileName,
                p.video.fileId
              )
            );
          }
      
          if (p.thumbnail?.fileId) {
            file.push(
              deleteFileFromB2_Public(
                p.thumbnail.fileName,
                p.thumbnail.fileId
              )
            );
          }
          await Promise.all(file);
    })
    await talentPostDataModel.findOneAndDelete({post_id:post_id})
    talentRoom.markModified("queue");
    await talentRoom.save()
    const structuredTalent =
        await generateTalentStage(
          talentRoom.name,
          talentRoom.region
        );
    return res
        .status(200)
        .json(structuredTalent);

   } 

   export const deleteContestantFromEliminations =   async(req,res)=>{
    const room_id = req.params.id;
    const user_id = req.body.user_id;
    const post_id = req.body.post_id;
    const talentRoom = await talentModel.findById(room_id)
    if(!talentRoom) return res.json("expired")
    const deletedContestant = talentRoom.eliminations.find(c => c.user_id.toString() == user_id)
    talentRoom.eliminations = talentRoom.eliminations.filter(u => u.user_id.toString() !== user_id)
    talentRoom.voters =  talentRoom.voters.filter(v => v.post_id !== post_id)
    deletedContestant.performances.forEach(async(p) => {
          const file = []
          if (p.video?.fileId) {
            file.push(
              deleteFileFromB2_Private(
                p.video.fileName,
                p.video.fileId
              )
            );
          }
      
          if (p.thumbnail?.fileId) {
            file.push(
              deleteFileFromB2_Public(
                p.thumbnail.fileName,
                p.thumbnail.fileId
              )
            );
          }
          await Promise.all(file);
    })
    await talentPostDataModel.findOneAndDelete({post_id:post_id})
    talentRoom.markModified("eliminations");
    await talentRoom.save()
    const structuredTalent =
    await generateTalentStage(
      talentRoom.name,
      talentRoom.region
    );
    return res
    .status(200)
    .json(structuredTalent);
   }


  export const addUserPerformance = async(req,res)=>{
    const _id = req.params.id
    const talent = await talentModel.findById(_id)
    if(req.body.type !== "eupdate"){
    const contestant = req.body.type == "update" ? talent.contestants.find(c => c.user_id.toString() === req.body.user_id ):
                                                   talent.queue.find(c => c.user_id.toString() === req.body.user_id )
    const videoFileName =  req.body.videoFileName
    const videoFileId  = req.body.videoFileId
    const thumbnailFileName  = req.body.thumbnailFileName ;
    const thumbnailFileId  = req.body.thumbnailFileId ;
    const thumbnailSignedUrl = await getPublicUrlFromB2(thumbnailFileName)
    const thumbNailCdnUrl = thumbnailSignedUrl.replace(
      "https://f005.backblazeb2.com",
      "https://cdn.challenmemey.com"
    );
    const signedUrl = await getSignedUrlFromB2(
        videoFileName
    );
    const cdnUrl = signedUrl.replace(
      "https://f005.backblazeb2.com",
      "https://cdn.challenmemey.com"
    );
    contestant.performances.unshift({
      video: {  
            fileId:videoFileId ,
            fileName:videoFileName ,
            signedUrl :signedUrl ,
            cdnUrl: cdnUrl ,
      },
      thumbnail: {
            fileId:thumbnailFileId,
            fileName:thumbnailFileName,
            publicUrl:thumbNailCdnUrl,
      },
      date: new Date()
   })
  //  req.body.type == "update" && talent.markModified("contestants");
  //  req.body.type == "qupdate" && talent.markModified("queue");
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
                talentName:talent.name,
                region:talent.region, 
                profile_img:req.body.profile_img,
                name:req.body.name,
                email:req.body.email,  
            }
          
        }

        await notificationModel(notification).save()
     })
     talent.contestants.forEach(async(c)=>{
      if(req.body.user_id !== c.user_id && !friend?.friends.find(f => f.user_idtoString() == c.user_id)){
        let   message = "has updated his post in the Talent Contest you are posted in"     
        const notification = {
          receiver_id:c.user_id,
          type:"talent",
          isRead:false,
          message:message , 
          content: {  
              sender_id:req.body.user_id,
              talentRoom_id:_id,
              talentName:talent.name,
              region:talent.region, 
              profile_img:req.body.profile_img,
              name:req.body.name,
              email:req.body.email,  
          }
      }
      await notificationModel(notification).save()
    }
    })
    }
    if(!talent) return res.json({error:"expired"}).status(404)
  }else {
       const talent = await talentModel.findById(_id)
       if(!talent) return res.json({error:"expired"}).status(404)
       const index = talent.eliminations.findIndex( e => e.user_id.toString() == req.body.user_id)
       if(index !== -1) {
       const eliminatedContestant = talent.eliminations.splice(index,1)
       let contestant = eliminatedContestant[0]
       contestant.video_url = req.body.video_url
       contestant.thumbNail_URL = req.body.thumbNail
       talent.queue.push(contestant)
  } 
}
await talent.save()
const  structuredTalent = await generateTalentStage(talent.name, talent.region)
res.json(structuredTalent)

}


export const deleteUserPerformanceStage = async(req,res)=>{
    const room_id = req.params.id;
    const user_id = req.body.user_id;
    const post_id = req.body.post_id;
    const performanceToDelete = req.body.performanceToDelete
    const talentRoom = await talentModel.findById(room_id)
    if(!talentRoom) return res.json("expired")
    const contestant = talentRoom.contestants.find(c => c.user_id.toString() == user_id)
    contestant.performances = contestant.performances.filter(p => p.video.fileId !== performanceToDelete.video.fileId)
    talentRoom.markModified("contestants");
    await talentRoom.save()
    let filesToDelete = []
    if (performanceToDelete.video?.fileId) {
      filesToDelete.push(
        deleteFileFromB2_Private(
          performanceToDelete.video.fileName,
          performanceToDelete.video.fileId
        )
      );  
    }
    if (performanceToDelete.thumbnail?.fileId) {
      filesToDelete.push(
        deleteFileFromB2_Public(
          performanceToDelete.thumbnail.fileName,
          performanceToDelete.thumbnail.fileId
        )
      );     
    }
    await Promise.all(filesToDelete);
    const structuredTalent =
    await generateTalentStage(
        talentRoom.name,
        talentRoom.region
      );
    return res
      .status(200)
      .json(structuredTalent);
   }

   export const deleteUserPerformanceQueue = async(req,res)=>{
    const room_id = req.params.id;
    const user_id = req.body.user_id;
    const post_id = req.body.post_id;
    const performanceToDelete = req.body.performanceToDelete
    const talentRoom = await talentModel.findById(room_id)
    if(!talentRoom) return res.json("expired")
    const contestant = talentRoom.queue.find(c => c.user_id.toString() == user_id)
    contestant.performances = contestant.performances.filter(p => p.video.fileId !== performanceToDelete.video.fileId)
    talentRoom.markModified("queue");
    await talentRoom.save()
    let filesToDelete = []
    if (performanceToDelete.video?.fileId) {
      filesToDelete.push(
        deleteFileFromB2_Private(
          performanceToDelete.video.fileName,
          performanceToDelete.video.fileId
        )
      );  
    }
    if (performanceToDelete.thumbnail?.fileId) {
      filesToDelete.push(
        deleteFileFromB2_Public(
          performanceToDelete.thumbnail.fileName,
          performanceToDelete.thumbnail.fileId
        )
      );     
    }
    await Promise.all(filesToDelete);
    const structuredTalent =
    await generateTalentStage(
        talentRoom.name,
        talentRoom.region
      );
    return res
      .status(200)
      .json(structuredTalent);
   }

   export const getEliminatedUserBackToQueue = async(req,res)=>{
    const room_id = req.params.id;
    const user_id = req.body.user_id;
    const post_id = req.body.post_id;
    const talentRoom = await talentModel.findById(room_id)
    if(!talentRoom) return res.json("expired")
    const contestant = talentRoom.eliminations.find(c => c.user_id.toString() == user_id)
    talentRoom.eliminations = talentRoom.eliminations.filter(u => u.user_id.toString() !== user_id)
    talentRoom.queue.push(contestant)
    talentRoom.markModified("eliminations");
    talentRoom.markModified("queue");
    await talentRoom.save()
    const structuredTalent =
    await generateTalentStage(
        talentRoom.name,
        talentRoom.region
      );
    return res
      .status(200)
      .json(structuredTalent);
   }