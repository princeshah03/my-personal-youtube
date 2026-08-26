import { Router } from "express";
import { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription } from "../controller/subscription.controller.js";
import { verifyJWT } from "../midddlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT)

router.route("/c/:channelId")
    .get(getUserChannelSubscribers)
    .post(toggleSubscription)

router.route("/u/:subscriberId").get(getSubscribedChannels)

export default router