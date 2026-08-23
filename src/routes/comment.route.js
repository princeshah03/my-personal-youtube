import { Router } from "express";
import { getVideoComments } from "../controller/comment.controller.js";
import { verifyJWT } from "../midddlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT)

router.route("/:videoId").get(getVideoComments)