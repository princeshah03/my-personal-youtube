import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    if (channelId.toString() === req.user?._id?.toString()) {
        throw new ApiError(400, "You can not subscribe to your own channel")
    }

    const channelExists = await User.exists({ _id: channelId });

    if (!channelExists) {
        throw new ApiError(404, "Channel not found");
    }

    const existingSubscriber = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    });

    if (existingSubscriber) {
        await Subscription.findByIdAndDelete(existingSubscriber._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isSubcribed: false }, "Unsubscribed successfull"));
    }

    const newSubscription = await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { isSubcribed: true, subscription: newSubscription }, "Subscribed successfull"));
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const channelExists = await User.exists({ _id: channelId });
    if (!channelExists) {
        throw new ApiError(404, "Channel does not exist");
    }

    if (channelId.toString() !== req.user?._id?.toString()) {
        throw new ApiError(403, "You are not able to see the channel subscribers");
    }

    const channelSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscribers",
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
                subscriber: {
                    $first: "$subscribers"
                }
            }
        },
        {
            $project: {
                _id: 1,
                subscriber: 1,
                createdAt: 1
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, { subscribers: channelSubscribers, totalSubscribers: channelSubscribers.length }, "Subscribers fetched successfull"));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber Id");
    }

    const subscriberExist = await User.exists({ _id: subscriberId })
    if (!subscriberExist) {
        throw new ApiError(404, "Subscriber not exists")
    }

    if (subscriberId.toString() !== req.user?._id?.toString()) {
        throw new ApiError(403, "You are not authorized to view subscribed channels for this user")
    }

    const subscribedChannel = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
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
                channel: {
                    $first: "$channel"
                }
            }
        },
        {
            $project: {
                _id: 1,
                channel: 1,
                createdAt: 1
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, { channels: subscribedChannel, totalSubscribedChannels: subscribedChannel.length }, "channel fetched successfull"));
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}