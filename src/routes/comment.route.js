import { Router } from "express";
import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment
} from "../controller/comment.controller.js";
import { verifyJWT } from "../midddlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT)

router.route("/:videoId").get(getVideoComments).post(addComment);
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router; 