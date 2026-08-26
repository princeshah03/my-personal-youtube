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
})

export {
    toggleSubscription,
}