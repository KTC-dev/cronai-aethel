import fetch from 'node-fetch';

const FAL_AI_BASE_URL = "https://api.fal.ai";

export async function callFalAi(model, input) {
    const response = await fetch(`${FAL_AI_BASE_URL}/models/${model}/predict`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.FAL_AI_API_KEY}`,
        },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Fal.ai API error: ${response.status} ${response.statusText} - ${errorBody.detail || JSON.stringify(errorBody)}`);
    }

    return response.json();
}

export async function getFaceEmbedding(imageUrl) {
    // Using InsightFace for face embedding
    return callFalAi("insightface/insightface", { image_url: imageUrl });
}

export async function cloneVoice(voiceSampleUrl, scriptText) {
    // Using Resemble Chatterbox HD for voice cloning
    return callFalAi("resemble-ai/resemble-chatterbox-hd", {
        audio_url: voiceSampleUrl,
        text: scriptText,
    });
}

export async function generateVideo(scriptText, faceEmbedding, emotionalContext) {
    // Using Wan 2.5 Image-to-Video for cinematic B-roll
    return callFalAi("stability-ai/stable-video-diffusion", {
        prompt: scriptText,
        face_embedding: faceEmbedding,
        // We'll need a way to derive emotional context from the script
        // For MVP, this might be a simple keyword analysis or a separate Fal.ai model
        mood: emotionalContext, // Placeholder
    });
}

export async function generateMusic(emotionalContext, duration) {
    // Using MiniMax Music v2 for background music
    return callFalAi("stability-ai/minimax-music-v2", {
        prompt: emotionalContext,
        duration: duration,
    });
}
