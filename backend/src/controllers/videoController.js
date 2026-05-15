import * as falService from "../services/falService";
import { sendMessageToQueue } from "../../workers-site/src/utils/queue";

export async function createVideo(req, res) {
    const { script, voiceSample, facePhotos, logo } = req.body;

    // Basic validation
    if (!script || !voiceSample || !facePhotos) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // Here we would typically store assets in R2 first and get their URLs
        // For MVP, we'll assume direct processing or pre-uploaded assets

        const job = await sendMessageToQueue(
            req.app.get("queue"),
            {
                type: "video_generation",
                payload: { script, voiceSample, facePhotos, logo },
            }
        );

        res.status(202).json({ message: "Video generation job started", jobId: job.id });
    } catch (error) {
        console.error("Error starting video generation job:", error);
        res.status(500).json({ error: "Failed to start video generation job" });
    }
}
