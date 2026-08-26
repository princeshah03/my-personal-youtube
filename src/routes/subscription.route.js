import { Router } from "express";
import { toggleSubscription } from "../controller/subscription.controller.js";
import { verifyJWT } from "../midddlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT)

router.route("/c/:channelId").post(toggleSubscription)

export default router