import friendModel from "../models/friends.js"
import notificationModel from "../models/notifications.js"
import talentModel from "../models/talent.js"
import userModel from "../models/users.js"
import { deleteFileFromB2_Public, getPublicUrlFromB2, getUploadPrivateUrl, getUploadPublicUrl } from "../utilities/blackBlazeb2.js"


export const getUserById = async(req,res)=>{ // get single user by _id
    const userId = req.params.id
    const user = await userModel.findById(userId)
    if(!user) return res.json({error:"cant find the user"}).status(404)
    res.status(200).json(user)
}

export const deleteUserById = async(req,res)=>{ // delete single user by _id
    const userId = req.params.id
    const user = await userModel.findByIdAndDelete(userId)
    if(!user) return res.json({error:"cant find the user"}).status(404)
    res.status(200).json(user)
  }

  export const updateUserInfoById = async(req,res)=>{ 
    console.log(req.body.name)
    const userId = req.params.id
    const user = await userModel.findByIdAndUpdate(
             userId,
            req.body,
            { new: true }
          )
    if(!user) return res.json({error:"cant find the user"}).status(404)
    res.status(200).json(user)
  }


  export const getUploadVideoUrl = async (req, res) => {
    try {
        console.log(req.body)
      const { userId ,name , type } = req.body;
      // type = "profile" | "cover" | "post"
      let fileName =  ""
      if(type == "profile" || type == "cover") 
           fileName =`users/${name.replace(/\s+/g, "")}_${userId}/${type}/${type}_${Date.now()}.jpg` 
      if (type == "talent" || type == "challenge" )
          fileName = `users/${name.replace(/\s+/g, "")}_${userId}/${type}_contests/submission_${Date.now()}.mp4`
      if (type == "thumbnail")  
            fileName = `users/${name.replace(/\s+/g, "")}_${userId}/${type}/thumbnail_${Date.now()}.jpg`;
      const uploadUrlResponse = await getUploadPrivateUrl()
      res.json({
        uploadUrl: uploadUrlResponse.data.uploadUrl,
        authorizationToken: uploadUrlResponse.data.authorizationToken,
        fileName:fileName,
      });   
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  export const getUploadImageUrl = async (req, res) => {
    try {
      const { userId ,name , type } = req.body;
      // type = "profile" | "cover" | "post"
      let fileName =  ""
      if(type == "profile" || type == "cover") 
           fileName =`users/${name.replace(/\s+/g, "")}_${userId}/${type}/${type}_${Date.now()}.jpg` 
      // if (type == "talent" || type == "challenge" )
      //     fileName = `users/${name.replace(/\s+/g, "")}_${userId}/${type}_contests/submission_${Date.now()}.mp4`
      if (type == "thumbnail")  
            fileName = `users/${name.replace(/\s+/g, "")}_${userId}/${type}/thumbnail_${Date.now()}.jpg`;
      const uploadUrlResponse = await getUploadPublicUrl ()
      res.json({
        uploadUrl: uploadUrlResponse.data.uploadUrl,
        authorizationToken: uploadUrlResponse.data.authorizationToken,
        fileName:fileName,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }


  export const saveProfileImage = async (req, res) => {
    try {
      const { userId, fileId, fileName, deleteFileId, deleteFileName } = req.body;
  
      if (!userId || !fileId || !fileName) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const signedUrl = await getPublicUrlFromB2(fileName);
      const cdnUrl = signedUrl.replace(
        "https://f005.backblazeb2.com",
        "https://cdn.challenmemey.com"
      );
  
      const updatedUser = await userModel.findByIdAndUpdate(
        userId,
        {
          $set: {
            profileImage: {
              fileId,
              fileName,
              publicUrl: cdnUrl,
            },
          },
        },
        { new: true }
      );
  
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
  
      if (deleteFileId && deleteFileName) {
        deleteFileFromB2_Public(deleteFileName, deleteFileId)
          .catch(err => console.error("Delete error:", err));
      }
  
      await talentModel.updateMany(
        {},
        {
          $set: {
            "contestants.$[c].profile_img": cdnUrl,
            "queue.$[q].profile_img": cdnUrl,
            "eliminations.$[e].profile_img": cdnUrl,
          },
        },
        {
          arrayFilters: [
            { "c.user_id": userId },
            { "q.user_id": userId },
            { "e.user_id": userId },
          ],
        }
      );
      let findFriend = await friendModel.findOne({ user_id: userId });
      findFriend.profile_img = cdnUrl ; 
      await findFriend.save()
  
      return res.json(updatedUser);
  
    } catch (err) {
      console.error("SAVE PROFILE IMAGE ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }


  export const saveCoverImage = async (req, res) => {
    try {
      const { userId, fileId, fileName, deleteFileId, deleteFileName } = req.body;
  
      if (!userId || !fileId || !fileName) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const signedUrl = await getPublicUrlFromB2(fileName);
  
      const cdnUrl = signedUrl.replace(
        "https://f005.backblazeb2.com",
        "https://cdn.challenmemey.com"
      );
      const updatedUser = await userModel.findByIdAndUpdate(
        userId,
        {
          $set: {
            coverImage: {
              fileId,
              fileName,
              publicUrl: cdnUrl,
            },
          },
        },
        { new: true }
      );
  
      let findFriend = await friendModel.findOne({ user_id: userId });
      findFriend.cover_img = cdnUrl ; 
      await findFriend.save()
  
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
  
      // 3️⃣ Delete old file (NON-BLOCKING)
      if (deleteFileId && deleteFileName) {
        deleteFileFromB2_Public(deleteFileName, deleteFileId)
          .catch(err => console.error("Delete error:", err));
      }
  
      return res.json( updatedUser );
  
    } catch (err) {
      console.error("SAVE PROFILE IMAGE ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }


  export const getUserNotificationsByUserId = async(req,res)=>{
    const receiver_id = req.params.id;
    const notifications = await notificationModel.find({receiver_id:receiver_id}).sort({ createdAt: -1 });
    res.json(notifications).status(200)
  }

  export const updateNotificationById = async(req,res)=>{
    const _id = req.params.id;
    const notification = await notificationModel.findById(_id)
    if(!notification) return res.json("notification expired")
    notification.isRead = true;
    await notification.save();
    res.json(notification).status(200)
  }

  export const deleteNotificationById  = async(req,res)=>{
    const _id = req.params.id;
    const notifications = await notificationModel.findByIdAndDelete(_id)
    res.json("deleted").status(200)
  }