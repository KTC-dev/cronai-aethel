import { R2Bucket, CloudflareQueue } from "@cloudflare/workers-types";

// Placeholder for R2 and Queue bindings
// These will be available in the Workers environment

export const getR2Bucket = (env) => {
    if (!env.CRONAI_ASSETS) {
        throw new Error("CRONAI_ASSETS R2 bucket not bound");
    }
    return env.CRONAI_ASSETS;
};

export const getQueue = (env) => {
    if (!env.VIDEO_QUEUE) {
        throw new Error("VIDEO_QUEUE not bound");
    }
    return env.VIDEO_QUEUE;
};
