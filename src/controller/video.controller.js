import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary, cloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10
    const skip = (pageNumber - 1) * limitNumber;

    const allowFields = [
        "createdAt",
        "updatedAt",
        "views",
        "duration",
    ]

    if (sortBy && !allowFields.includes(sortBy)) {
        throw new ApiError(400, "Invalid sortBy field")
    }

    if (sortType && !["asc", "desc"].includes(sortType)) {
        throw new ApiError(400, "sortType must be either 'asc' or 'desc'")
    }

    const sortField = sortBy || "createdAt";
    const sortDirection = sortType?.toLowerCase() === "asc" ? 1 : -1;

    const sort = {
        [sortField]: sortDirection
    };


    const match = {
        isPublished: true
    };

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid user ID")
        }
        match.owner = new mongoose.Types.ObjectId(userId)
    }

    if (query?.trim()) {
        match.title = {
            $regex: query.trim(),
            $options: "i"
        }
    }

    const videos = await Video.aggregate([
        {
            $match: match
        },
        {
            $sort: sort
        },
        {
            $skip: skip
        },
        {
            $limit: limitNumber
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: 1
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"))
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if (!title?.trim() || !description?.trim()) {
        throw new ApiError(400, "Title and description are required");
    }


    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required");
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is required");
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile?.url) {
        throw new ApiError(500, "Failed to upload video to Cloudinary");
    }
    if (!thumbnail?.url) {
        throw new ApiError(500, "Failed to upload thumbnail to Cloudinary");
    }

    const video = await Video.create({
        title: title.trim(),
        description: description.trim(),
        videoFile: {
            url: videoFile.url,
            public_id: videoFile.public_id
        },
        thumbnail: {
            url: thumbnail.url,
            public_id: thumbnail.public_id
        },
        duration: videoFile.duration || 0,
        views: 0,
        isPublished: true,
        owner: req.user._id
    });

    const createdVideo = await Video.findById(video._id);

    if (!createdVideo) {
        throw new ApiError(500, "Something went wrong when publishing the video");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, createdVideo, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscriberCount: {
                                $size: "$subscribers"
                            },
                            isSubscribe: {
                                $cond: {
                                    if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            subscriberCount: 1,
                            isSubscribe: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likeCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                thumbnail: 1,
                duration: 1,
                description: 1,
                views: 1,
                title: 1,
                videoFile: 1,
                createdAt: 1,
                owner: 1,
                likeCount: 1,
                isLiked: 1,
                isPublished: 1,
            }
        }
    ])

    if (!video?.length) {
        throw new ApiError(404, "video does not exist")
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }
    });

    if (req.user?._id) {
        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { watchHistory: videoId }
        })
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video fetched successfully"))
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailLocalPath = req.file?.path;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    if (!title?.trim() && !description?.trim() && !thumbnailLocalPath) {
        throw new ApiError(400, "At least one field (title, description, or thumbnail) is required to update");
    }

    const currentVideo = await Video.findById(videoId)

    if (!currentVideo) {
        throw new ApiError(404, "video is not exist")
    }

    if (currentVideo.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to update this video");
    }

    const updateFields = {};

    if (title?.trim()) {
        updateFields.title = title.trim();
    }

    if (description?.trim()) {
        updateFields.description = description.trim();
    }

    if (thumbnailLocalPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

        if (!thumbnail?.url) {
            throw new ApiError(500, "Something went wrong while uploading thumbnail");
        }

        if (currentVideo.thumbnail?.public_id) {
            await cloudinary.uploader.destroy(currentVideo.thumbnail.public_id)
        }

        updateFields.thumbnail = {
            url: thumbnail.url,
            public_id: thumbnail.public_id
        };
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: updateFields
        },
        {
            returnDocument: "after"
        }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const currentVideo = await Video.findById(videoId);

    if (!currentVideo) {
        throw new ApiError(404, "Video does not exist")
    }

    if (currentVideo.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to delete this video");
    }

    const deletePromises = [];

    if (currentVideo.videoFile?.public_id) {
        deletePromises.push(cloudinary.uploader.destroy(currentVideo.videoFile?.public_id, { resource_type: "video" }));
    }

    if (currentVideo.thumbnail?.public_id) {
        deletePromises.push(cloudinary.uploader.destroy(currentVideo.thumbnail.public_id, { resource_type: "image" }))
    }

    await Promise.all(deletePromises);

    await Video.findByIdAndDelete(videoId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"))
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const toggleVideoStatus = await Video.findOneAndUpdate(
        {
            _id: videoId,
            owner: req.user._id
        },
        [
            {
                $set: {
                    isPublished: {
                        $not: "$isPublished"
                    }
                }
            }
        ],
        {
            new: true,
            updatePipeline: true
        }
    );

    if (!toggleVideoStatus) {
        throw new ApiError(404, "Video not found or you do not have permission");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, toggleVideoStatus, "Toggle video status successfully"))

});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}