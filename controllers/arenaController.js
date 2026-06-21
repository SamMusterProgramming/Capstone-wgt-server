import mongoose from "mongoose"
import arenaModel from "../models/arena.js"
import arenaPostModel from "../models/arenaPost.js"
import { deleteFileFromB2_Private, deleteFileFromB2_Public, getPublicUrlFromB2, getSignedUrlFromB2 } from "../utilities/blackBlazeb2.js"
import localArenas from "../redisCash/arenas/localArenas.js"

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
    return res.json(arena)
   } catch (error) {
      console.log(error)
   }
}

export const getArenaByUser = async (req, res) => {
    try {
     const userId = req.params.id
     const arenas = await arenaModel.find({owner_id:userId})
     return res.json(arenas)
    } catch (error) {
       console.log(error)
    }
 }

export const getLocalArenas = async (req, res) => {
  try {
    const countryCode  = req.params.id
    const { userId } = req.body;
    const arenas = await localArenas(countryCode)
    //  await arenaModel.aggregate([
    //   {
    //     $match: {
    //       region: countryCode,
    //     },
    //   },
    //   { 
    //     $addFields: {
    //       postsCount: {
    //         $size: "$posts",
    //       },
    //       starsCount: {
    //         $size: "$stars",
    //       },
    //       followersCount: {
    //         $size: "$followers",
    //       },
    //     },
    //   },
    //   // only arenas with performances
    //   {
    //     $match: {
    //       postsCount: { $gt: 0 },
    //     },
    //   },
    //   {
    //     $addFields: {
    //       score: {
    //         $add: [
    //           {
    //             $multiply: [
    //               "$postsCount",
    //               10,
    //             ],
    //           },
    //           {
    //             $multiply: [
    //               "$starsCount",
    //               2,
    //             ],
    //           },
    //         ],
    //       },
    //       isStarred: {
    //         $in: [
    //           new mongoose.Types.ObjectId(userId),
    //           "$stars",
    //         ],
    //       },
    //       isFollowing: {
    //         $in: [
    //           new mongoose.Types.ObjectId(userId),
    //           "$followers",
    //         ],
    //       },
    //     },
    //   },
    //   {
    //     $sort: {
    //       score: -1,
    //       postsCount: -1,
    //       starsCount: -1,
    //       createdAt: -1,
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "arenaposts",
    //       localField: "posts",
    //       foreignField: "_id",
    //       as: "posts",
    //     },
    //   },
    //   {
    //     $project: {
    //       owner_id: 1,
    //       arenaName: 1,
    //       talentType: 1,
    //       region: 1,
    //       biography: 1,
    //       description: 1,
    //       coverImage: 1,
    //       profileImage: 1,
    //       posts: 1,
    //       stars: 1,
    //       followers: 1,
    //       postsCount: 1,
    //       starsCount: 1,
    //       followersCount: 1,
    //       isStarred: 1,
    //       isFollowing: 1,
    //       verified: 1,
    //       score: 1,
    //     },
    //   },
    //   {
    //     $limit: 20,
    //   },
    // ]);
   
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
     const {owner_id,description,spotlight,video,thumbnail} = req.body
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
          spotlight,
      });
      const arena = await arenaModel.findByIdAndUpdate(
        arenaId,
        {
          $push: {
            posts: post._id,
          },
        }
      );
      return res.json(arena)
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
      return res.status(200).json(updatedArena);
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
    const post =
      await arenaPostModel.findById(
        post_id
      );
    const fired =
      post.fires.some(
        id =>  id.toString() === userId
      );
    if (fired) {
      post.fires =
        post.fires.filter(
          id =>
            id.toString() !== userId
        );
    } else {
      post.fires.push(userId);
    }
    await post.save();
    return res.json(post);
  };