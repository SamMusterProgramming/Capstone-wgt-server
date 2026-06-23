import mongoose from "mongoose";

const favouriteSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      unique: true,
    },

    favourites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "talentRoom",
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// favouriteSchema.index({
//   user_id: 1,
// });
let favouriteModel =mongoose.model( "favourites", favouriteSchema);
export default favouriteModel ;