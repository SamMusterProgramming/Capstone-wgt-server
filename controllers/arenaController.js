import arenaModel from "../models/arena.js"

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