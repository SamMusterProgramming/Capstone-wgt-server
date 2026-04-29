import mongoose from "mongoose";
import talentModel from "../models/talent.js"
import notificationModel from "../models/notifications.js";
import favouriteModel from "../models/favourites.js";
import friendModel from "../models/friends.js";


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
                    user_id: "$$q.user_id",
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
                    user_id: "$$e.user_id",
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
          }
  
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