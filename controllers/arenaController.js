import arenaModel from "../models/arena.js"
import arenaPostModel from "../models/arenaPost.js"
import { getPublicUrlFromB2, getSignedUrlFromB2 } from "../utilities/blackBlazeb2.js"

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
     const {owner_id,description,spotLight,video,thumbnail} = req.body
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
            },
            thumbnail: {
              cdnUrl: thumbNailCdnUrl,
              fileId: thumbnail.fileId,
            },
          },
        //   spotLight,
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
