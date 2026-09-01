import userModel from "../../models/users.js";



 const getUserProfile = async (userId) => {
    if (!userId) return null;

    try {
        const user = await userModel
            .findById(userId)
            .select("-password")
            .lean();

        return user || null;

    } catch (error) {
        console.error(
            "GET USER PROFILE ERROR:",
            error
        );

        return null;
    }
};

export default getUserProfile;
