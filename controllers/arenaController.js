import mongoose from "mongoose"
import arenaModel from "../models/arena.js"
import arenaPostModel from "../models/arenaPost.js"
import { deleteFileFromB2_Private, deleteFileFromB2_Public, getPublicUrlFromB2, getSignedUrlFromB2 } from "../utilities/blackBlazeb2.js"
import localArenas from "../redisCash/arenas/localArenas.js"
import userArenas from "../redisCash/arenas/userArenas.js"
import redis from "../config/redis.js"


const recalculateSpotlightScore = (post) => {
    let score =
      (post.viewCount * 0.1) +
      (post.fireCount * 3) +
      (post.commentCount * 5) +
      (post.shareCount * 8);
  
    const ageHours =
      (Date.now() - new Date(post.createdAt).getTime()) /
      (1000 * 60 * 60);
  
    if (ageHours <= 24) score += 100;
    else if (ageHours <= 72) score += 50;
    else if (ageHours <= 168) score += 20;
  
    post.spotlightScore = score;
    post.spotlight = score >= 150;
  };

export const createArena = async (req, res) => {
   try {
    const userId = req.params.id
    const {arenaName,
            talentType,
            region,
            biography,
            description,
            coverImage ,
            profileImage
          } = req.body
    const existArena = await arenaModel.findOne({
        owner_id:userId,
        talentType
    })
    if(existArena) return res.json({ message:"arena exists already"})
    const arena = await arenaModel.create({
        owner_id : userId ,
        arenaName,
        talentType,  
        region,
        biography,
        description,
        profileImage,
        coverImage
    })
    const arenas = await userArenas(userId , true)
    return res.json({
        arenas:arenas,
        selectedArena:arenas.find ( a => a._id.toString() === arena._id.toString())
    })
   } catch (error) {
      console.log(error)
   }
}

export const updateArena = async (
    req,
    res
  ) => {
    try {
      const arena_id = req.params.id
      const {
        userId,
        biography,
        description,
        profileImage,
        coverImage,
      } = req.body
      console.log(req.body)
      const updateData = {};

      if (biography !== undefined)
            updateData.biography = biography;

      if (description !== undefined)
            updateData.description = description;

      if ( profileImage?.fileId !== undefined)
        {
          const signedUrl = await getPublicUrlFromB2(profileImage.fileName);
          const cdnUrl = signedUrl.replace(
          "https://f005.backblazeb2.com",
          "https://cdn.challenmemey.com"
          );
          updateData.profileImage = {
             publicUrl : cdnUrl ,
             fileId : profileImage.fileId,
             fileName : profileImage .fileName
          }
        }

      if (coverImage?.fileId !== undefined ) 
        {
            const signedUrl = await getPublicUrlFromB2(coverImage.fileName);
            const cdnUrl = signedUrl.replace(
            "https://f005.backblazeb2.com",
            "https://cdn.challenmemey.com"
            );
            updateData.coverImage = {
                publicUrl : cdnUrl ,
                fileId : coverImage.fileId,
                fileName : coverImage.fileName
            }
        }
      console.log(updateData)
      const arena = await arenaModel.findOneAndUpdate(
        {
            _id: arena_id,
            owner_id: userId,
        },
        {
            $set: updateData,
        },
        {
            new: true,
        }
      );
      
     if (!arena) {
        return res.status(404).json({
          message: "Arena not found",
        });
     }

     await redis.del(
        `user_arenas_${userId}`
      );
  
      await redis.del(
        `local_arenas_${arena.region}`
      );

      const freshArenas = await userArenas(
                        userId,
                        true // refreshCache
                    );

      return res.status(200).json({
         arenas : freshArenas ,
         selectedArena : freshArenas.find ( a => a._id.toString() === arena._id.toString()) 
      });
  
    } catch (error) {
      console.error(
        "editArena error:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          "Failed to update arena",
      });
    }
  };

export const deleteArena = async (req, res) => {
    try {
        const  arena_id  = req.params.id;
        const {userId} = req.body
        if (!arena_id) {
          return res.status(400).json({
            success: false,
            message: "arena_id is required",
          });
        }
        const arena =
          await arenaModel.findById(
            arena_id
          );
    
        if (!arena) {
          return res.status(404).json({
            success: false,
            message: "Arena not found",
          });
        }
        // delete performances
        await arenaPostModel.deleteMany({
          _id: {
            $in: arena.posts || [],
          },
        });
    
        // delete arena
    
        await arenaModel.findByIdAndDelete(
          arena_id
        );
    
        // optional cache cleanup
        await redis.del(
        `local_arenas_${arena.region}`
        );
        await redis.del(
        `user_arenas_${arena.owner_id}`
        );
        const arenas = await userArenas(userId , true)
        return res.json({
        arenas,
        selectedArena: arenas.length !== 0 ? arenas[0] : null
        });
      } catch (error) {
        console.error(
          "deleteArena error:",
          error
        );
        return res.status(500).json({
          success: false,
          message:
            "Failed to delete arena",
        });
      }
 }

export const getArenaByUser = async (req, res) => {
    try {
     const userId = req.params.id
     const arenas = await userArenas(userId , true)
     return res.json(arenas)
    } catch (error) {
       console.log(error)
    }
}

export const getArenaByProfile = async (req, res) => {
    try {
     const userId = req.params.id
     const arenas = await userArenas(userId , false)
     return res.json(arenas)
    } catch (error) {
       console.log(error)
    }
}

export const getLocalArenas = async (req, res) => {
  try {   
    const countryCode  = req.params.id
    console.log(countryCode)
    const { userId } = req.body;
    const arenas = await localArenas(countryCode , false)
    return res.status(200).json(arenas);
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Failed to load local arenas",
    });
  }
};

 export const toggleArenaStar = async (req, res) => {
    try {
      const  arenaId  = req.params.id;
      const { userId } = req.body;
      const arena = await arenaModel.findById(arenaId);
      if (!arena) {
        return res.status(404).json({
          success: false,
          message: "Arena not found",
        });
      }
      const alreadyStarred = arena.stars.some(
        starId => starId.toString() === userId
      );

      let query = {}
      if (alreadyStarred) {
        query = {
            $pull: {
              stars: userId,
            },
          }
      }else {
        query =  {
            $addToSet: {
              stars: userId,
            },
          }
      }
      const newArena =  await arenaModel.findByIdAndUpdate(
        arenaId,
        query,
        { new: true }
      );
      return res.status(200).json(newArena)
    } catch (error) {
      console.error(error);
  
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };

  export const toggleArenaFollower = async (req, res) => {
    try {
      const  arenaId  = req.params.id;
      const { userId } = req.body;
      const arena = await arenaModel.findById(arenaId);
      if (!arena) {
        return res.status(404).json({
          success: false,
          message: "Arena not found",
        });
      }
      const alreadyStarred = arena.followers.some(
        starId => starId.toString() === userId
      );
      let query = {}
      if (alreadyStarred) {
        query = {
            $pull: {
              followers : userId,
            },
          }
      }else {
        query =  {
            $addToSet: {
              followers : userId,
            },
          }
      }
      const newArena =  await arenaModel.findByIdAndUpdate(
        arenaId,
        query,
        { new: true }
      );
      return res.status(200).json(newArena)
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };


 export const getPostsArena = async (req, res) => {
    try {
        const arenaId = req.params.id
        const posts = await arenaPostModel
        .find({
          arena_id: arenaId,
        })
        .sort({
          createdAt: -1,
        });
        return res.json(posts)
    } catch (error) {
       console.log(error)
    }
 }
 

 export const addPerformanceToArena = async (req, res) => {
    try {
     const arenaId = req.params.id
     const {owner_id,description,video,thumbnail} = req.body
     // GENERATE URLS
     const thumbnailSignedUrl =
     await getPublicUrlFromB2(thumbnail.fileName);
     const thumbNailCdnUrl =
     thumbnailSignedUrl.replace(
        "https://f005.backblazeb2.com",
        "https://cdn.challenmemey.com"
     );
     const signedUrl =
     await getSignedUrlFromB2(video.fileName);
     const cdnUrl =
     signedUrl.replace(
        "https://f005.backblazeb2.com",
        "https://cdn.challenmemey.com"
     );
     const post = await arenaPostModel.create({
        arena_id: arenaId,
        owner_id,
        caption: description,
        media: {
            video: {
              cdnUrl: cdnUrl,
              fileId: video.fileId,
              fileName: video.fileName
            },
            thumbnail: {
              cdnUrl: thumbNailCdnUrl,
              fileId: thumbnail.fileId,
              fileName : thumbnail.fileName
            },
          },
      });

      const arena = await arenaModel.findByIdAndUpdate(
        arenaId,
        {
          $push: {
            posts: post._id,
          },
        }
      );
      const arenas = await userArenas(owner_id , true)
      return res.json({
                      arenas:arenas,
                      selectedArena:arenas.find( a => a._id.toString() === arena._id.toString())
                    })
    } catch (error) {
       console.log(error)
    }
 }

 export const deletePostFromArena = async (req, res) => {
    try {
      const  postId  = req.params.id;
      const post = await arenaPostModel.findById(postId);
      if (!post) {
        return res.status(404).json({
                                        message:
                                        "Post not found",
                                    });
      }
      const media = post.media;
      let filesToDelete = []
      if (media.video?.fileId) {
         filesToDelete.push(
           deleteFileFromB2_Private(
              media.video?.fileName,
              media.video?.fileId
           )
         );  
      }
      if (media.thumbnail?.fileId) {
         filesToDelete.push(
           deleteFileFromB2_Public(
              media.thumbnail.fileName,
              media.thumbnail.fileId
            )
         );     
      }
      await Promise.all(filesToDelete);

      const updatedArena =
      await arenaModel.findByIdAndUpdate(
        post.arena_id,
        {
            $pull: {
            posts: post._id,
            },
        },
        {
            new: true,
        }
      );
      await arenaPostModel.findByIdAndDelete(postId);
      const arenas = await userArenas(post.owner_id , true)
      return res.json({
        arenas:arenas,
        selectedArena:arenas.find( a => a._id.toString() === post.arena_id.toString())
      })
    } catch (error) {
       console.log(error)
    }
 }

 export const toggleSpotlight = async (req, res) => {
    try {
        const  post_id  = req.params.id;
        const post =
        await arenaPostModel.findById(
            post_id
        );
        if (!post) {
        return res.status(404).json({
            message: "Post not found",
        });
        }
        post.spotlight =
        !post.spotlight;
        await post.save();
        return res.status(200).json({
        message: post.spotlight
            ? "Featured in Spotlight"
            : "Returned to Arena",
        post,
        });
    } catch (error) {
        console.log(error)
    }
 }

 // user fire the performance , toggling 

 export const toggleFire = async (req,res) => {
    const post_id  = req.params.id;
    const { userId } = req.body;
    const post = await arenaPostModel.findById(
        post_id
      );
    const fired = post.fires.some(
        id =>  id.toString() === userId
      );
    if (fired) {
      post.fires = post.fires.filter(
          id =>  id.toString() !== userId
        );
    post.fireCount = Math.max( 0, (post.fireCount || 0) - 1 );
    } else {
      post.fires.push(userId);
      post.fireCount = (post.fireCount || 0) + 1;
    }

    recalculateSpotlightScore(post)
    await post.save();
    return res.json(post);
  };


  export const addPostView = async(req,res)=>{
    const postId = req.params.id;
    await arenaPostModel.findByIdAndUpdate(
      postId,
      {
        $inc:{
          viewCount:1
        }
      }
    );
    res.json({
      success:true
    });
   }