export async function uploadToR2(key, value, env) {
    await env.CRONAI_ASSETS.put(key, value);
}

export async function getFromR2(key, env) {
    return await env.CRONAI_ASSETS.get(key);
}
