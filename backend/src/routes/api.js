import express from "express";
import { createVideo } from "../controllers/videoController";
import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/video", authenticate, createVideo);

export default router;
