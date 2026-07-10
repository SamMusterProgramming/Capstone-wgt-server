import mongoose from "mongoose"
import arenaModel from "../models/arena.js"
import arenaPostModel from "../models/arenaPost.js"
import { deleteFileFromB2_Private, deleteFileFromB2_Public, getPublicUrlFromB2, getSignedUrlFromB2 } from "../utilities/blackBlazeb2.js"
import localArenas from "../redisCash/arenas/localArenas.js"
import userArenas from "../redisCash/arenas/userArenas.js"
import redis from "../config/redis.js"
import arenaFollowerModel from "../models/arena/arenaFollower.js"
import arenaStarModel from "../models/arena/arenaStar.js"
import arenaPostFireModel from "../models/arena/postArena/arenaPostFire.js"
import arenaById from "../redisCash/arenas/arenaById.js"
import postCommentArena from "../redisCash/arenas/postCommentArena.js"
import arenaPostCommentModel from "../models/arena/postArena/arenaPostComment.js"



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

// export const getArenaByProfile = async (req, res) => {
//     try {
//      const userId = req.params.id
//      const {requesterId} = req.body
//      const arenas = await userArenas(userId , false)
//      return res.json(arenas)
//     } catch (error) {
//        console.log(error)
//     }
// }

export const getArenaByProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const { requesterId } = req.body;
        const arenas = await userArenas(userId, false);
        if (!requesterId || arenas.length === 0) {
            return res.json(arenas);
        }
        const arenaIds = arenas.map(arena => arena._id);
        const [followers, stars] = await Promise.all([
            arenaFollowerModel.find(
                {
                    user_id: requesterId,
                    arena_id: { $in: arenaIds },
                },
                {
                    arena_id: 1,
                    _id: 0,
                }
            ),
            arenaStarModel.find(
                {
                    user_id: requesterId,
                    arena_id: { $in: arenaIds },
                },
                {
                    arena_id: 1,
                    _id: 0,
                }
            ),
        ]);
        const followedSet = new Set(
            followers.map(item => item.arena_id.toString())
        );
        const starredSet = new Set(
            stars.map(item => item.arena_id.toString())
        );
        const result = arenas.map(arena => ({
            ...arena,
            isFollower: followedSet.has(arena._id.toString()),
            isStarred: starredSet.has(arena._id.toString()),
        }));
        return res.json(result);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
        });
    }
};


export const getLocalArenas = async (req, res) => {
  try {   
    const countryCode  = req.params.id
    console.log(countryCode)
    const { userId } = req.body;
    const arenas = await localArenas(countryCode , true)
    return res.status(200).json(arenas);
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Failed to load local arenas",
    });
  }
};


//star arena , toggleStar
export const isUserStarredArena = async (req, res) => {
    try {
      const { arenaId, userId } = req.body;
      const exists = await arenaStarModel.exists({
        arena_id: arenaId,
        user_id: userId,
      });
      return res.json(exists);
    } catch (error) {
      console.error(error);
      return res.status(500).json(false);
    }
};

// export const toggleArenaStar = async (req, res) => {
//     try {
//       const  arenaId  = req.params.id;
//       const { userId } = req.body;
//       const arena = await arenaModel.findById(arenaId);
//       if (!arena) {
//         return res.status(404).json({
//           success: false,
//           message: "Arena not found",
//         });
//       }
//       const alreadyStarred = arena.stars.some(
//         starId => starId.toString() === userId
//       );
//       let query = {}
//       if (alreadyStarred) {
//         query = {
//             $pull: {
//               stars: userId,
//             },
//           }
//       }else {
//         query =  {
//             $addToSet: {
//               stars: userId,
//             },
//           }
//       }
//       const newArena =  await arenaModel.findByIdAndUpdate(
//         arenaId,
//         query,
//         { new: true }
//       );
//       return res.status(200).json(newArena)
//     } catch (error) {
//       console.error(error);
//       return res.status(500).json({
//         success: false,
//         message: "Server error",
//       });
//     }
//   };

export const toggleArenaStar = async (req, res) => {
    try {
      const { arenaId, userId } = req.body;
      const existing = await arenaStarModel.findOne({
        arena_id: arenaId,
        user_id: userId,
      });
      let starred = false;
      if (existing) {
        await arenaStarModel.deleteOne({
          _id: existing._id,
        });
        await arenaModel.findByIdAndUpdate(
          arenaId,
          {
            $inc: {
              starCount: -1,
            },
          },
          {new:true}
        );
  
      } else {
        await arenaStarModel.create({
          arena_id: arenaId,
          user_id: userId,
        });
        await arenaModel.findByIdAndUpdate(
          arenaId,
          {
            $inc: {
              starCount: 1,
            },
          },
          {new:true}
        );
        starred = true;
      }
    //   await redis.del(`arena_${arenaId}`);
      const arena = await arenaById(arenaId,true)
      const freshArena = {...arena, isStarred:starred}
      return res.json(freshArena);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
      });
    }
  };

//following , 
  export const isUserFollowingArena = async (req, res) => {
    try {
      const { arenaId, userId } = req.body;
      const exists = await arenaFollowerModel.exists({
        arena_id: arenaId,
        user_id: userId,
      });
      return res.json(exists);
    } catch (error) {
      console.error(error);
      return res.status(500).json(false);
    }
  };
  
//   export const toggleArenaFollower = async (req, res) => {
//     try {
//       const  arenaId  = req.params.id;
//       const { userId } = req.body;
//       const arena = await arenaModel.findById(arenaId);
//       if (!arena) {
//         return res.status(404).json({
//           success: false,
//           message: "Arena not found",
//         });
//       }
//       const alreadyStarred = arena.followers.some(
//         starId => starId.toString() === userId
//       );
//       let query = {}
//       if (alreadyStarred) {
//         query = {
//             $pull: {
//               followers : userId,
//             },
//           }
//       }else {
//         query =  {
//             $addToSet: {
//               followers : userId,
//             },
//           }
//       }
//       const newArena =  await arenaModel.findByIdAndUpdate(
//         arenaId,
//         query,
//         { new: true }
//       );
//       return res.status(200).json(newArena)
//     } catch (error) {
//       console.error(error);
//       return res.status(500).json({
//         success: false,
//         message: "Server error",
//       });
//     }
//   };
 
export const toggleArenaFollower = async (req, res) => {
    try {
      const { arenaId, userId } = req.body;
      const existing = await arenaFollowerModel.findOne({
        arena_id: arenaId,
        user_id: userId,
      });
      let following = false;
      
      if (existing) {
        await arenaFollowerModel.deleteOne({
          _id: existing._id,
        });
         await arenaModel.findByIdAndUpdate(
          arenaId,
          {
            $inc: {
              followerCount: -1,
            },
          },
          {new:true}
        );
      } else {
         await arenaFollowerModel.create({
          arena_id: arenaId,
          user_id: userId,
        });
         await arenaModel.findByIdAndUpdate(
          arenaId,
          {
            $inc: {
              followerCount: 1,
            },
          },
          {new:true}
        );
        following = true;
      }
  
      // invalidate cache
    //   await redis.del(`arena_${arenaId}`);
      const arena = await arenaById(arenaId,true)
      const freshArena = {...arena, isFollower:following}
      return res.json(freshArena);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
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
          $inc: {
            postCount: 1,
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

      await Promise.all([
        // remove all fires
        arenaPostFireModel.deleteMany({
          post_id:postId,
        }),
        // remove all comments
        arenaPostCommentModel.deleteMany({
          post_id:postId,
        }),
      ]);

      const updatedArena =
      await arenaModel.findByIdAndUpdate(
        post.arena_id,
        {
            $pull: {
            posts: post._id,
            },
            $inc: {
                postCount: -1,
            },
        },
        {
            new: true,
        }
      );
      await arenaPostModel.findByIdAndDelete(postId);
      await redis.del(
        `post_comments_${postId}`
      );
      await redis.del(
        `arena_${post.arena_id}`
      );
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

 export const isUserFiredPost = async (req, res) => {
    try {

        const { postId, userId } = req.body;
        const fired = await arenaPostFireModel.exists({
            post_id: postId,
            user_id: userId,
        });
        return res.json(fired);
    } catch (error) {
        console.error(error);
        return res.status(500).json(false);
    }
};


export const toggleFirePost = async (req, res) => {
    try {
        const { postId, userId } = req.body;
        const existing = await arenaPostFireModel.findOne({
            post_id: postId,
            user_id: userId,
        });
        let active = false;
        let count = 0;
        let post = {}
        if (existing) {
            await arenaPostFireModel.deleteOne({
                _id: existing._id,
            });
             post = await arenaPostModel.findByIdAndUpdate(
                postId,
                {
                    $inc: {
                        fireCount: -1,
                    },
                },
                {
                    new: true,
                    // select: "fireCount arena_id",
                }
            );
            count = post?.fireCount;
            // await redis.del(`arena_posts_${post.arena_id}`);

        } else {
            await arenaPostFireModel.create({
                post_id: postId,
                user_id: userId,
            });
                post = await arenaPostModel.findByIdAndUpdate(
                postId,
                {
                    $inc: {
                        fireCount: 1,
                    },
                },
                {
                    new: true,
                    // select: "fireCount arena_id",
                }
            );
            active = true;
            count = post?.fireCount;
        }
        await redis.del(`user_arenas_${post.owner_id.toString()}`);
        return res.json({
                         active,
                         post,
                         count
                       });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
        });
    }
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

   // comments 

   export const getArenaPostComments = async (req, res) => {
    try {
      const  postId  = req.params.id;
      const comments = await postCommentArena(postId,false);
      return res.status(200).json(comments);
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: "Server Error",
      });
    }
  };
  

  export const addArenaPostComments = async (req, res) => {
    try {
      const  postId  = req.params.id;
      const { userId, text } = req.body;
  
      if (!text?.trim()) {
        return res.status(400).json({
          message: "Comment cannot be empty.",
        });
      }
  
      const comment = await arenaPostCommentModel.create({
        post_id: postId,
        user_id: userId,
        text: text.trim(),
      });
  
      const post = await arenaPostModel.findByIdAndUpdate(
        postId,
        {
          $inc: {
            commentCount: 1,
          },
        }
      );
  
      // Invalidate comments cache
      await redis.del(`post_comments_${postId}`);
      await redis.del(`user_arenas_${post.owner_id.toString()}`);
      const comments = await postCommentArena(postId , true)
      console.log(comments)
      return res.status(201).json(comments);
  
    } catch (error) {
      console.error(error);
  
      return res.status(500).json({
        message: "Internal Server Error",
      });
    }
  };


  export const deleteArenaPostComment = async(req,res)=>{
    try{
      const { commentId , postId , userId }=req.body;
      if(!commentId || !postId){
        return res.status(400).json({
          message:"Missing data"
        });
      }
      const comment =  await arenaPostCommentModel.findOne({
          _id:commentId,
          post_id:postId
        });
      if(!comment){
        return res.status(404).json({
          message:"Comment not found"
        });
      }
      const post = await arenaPostModel.findById(postId);
      if(!post){
        return res.status(404).json({
          message:"Post not found"
        });
      }
      const isCommentOwner = comment.user_id.toString() ===userId.toString();
      const isPostOwner = post.owner_id.toString() === userId.toString();
      if( !isCommentOwner && !isPostOwner ){
        return res.status(403).json({
          message:"Not authorized"
        });
      }
      await arenaPostCommentModel.deleteOne({
        _id:commentId
      });
      await arenaPostModel.findByIdAndUpdate(
        postId,
        {
          $inc:{
            commentCount:-1
          }
        }
      );
      await redis.del(
        `post_comments_${postId}`
      );
      await redis.del(`user_arenas_${post.owner_id.toString()}`);
      const comments = await postCommentArena(postId , true)
      return res.status(200).json(comments);
    }
    catch(error){
      console.log(
        "deleteArenaComment error",
        error
      );
      return res.status(500).json({
        message:"Server error"
      });
    }
  };