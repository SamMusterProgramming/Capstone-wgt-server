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
        ref: "stages",
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

let favouriteModel = mongoose.model( "favourites", favouriteSchema);
export default favouriteModel ;