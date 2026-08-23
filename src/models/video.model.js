import mongoose, { Schema } from "mongoose";
import mongooseAggregatepaginate from "mongoose-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            url: {
                type: String,
                required: true
            },
            public_id: {
                type: String,
                required: true
            }
        },

        thumbnail: {
            url: {
                type: String,
                required: true
            },
            public_id: {
                type: String,
                required: true
            }
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        duration: {
            type: Number,
            required: true
        },
        isPublished: {
            type: Boolean,
            required: true
        },
        views: {
            type: Number,
            required: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
)

videoSchema.plugin(mongooseAggregatepaginate)
export const Video = mongoose.model("Video", videoSchema)