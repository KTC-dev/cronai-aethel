/**
 * AI Job Queue Processor
 * Handles async processing of video generation jobs
 */

import { runFullPipeline } from '../../aiPipelineService.js';

/**
 * Process a batch of messages from the queue
 */
export async function runQueue(env) {
    console.log('[Queue] Processing queue batch...');
    // This is called by the scheduled trigger to process any pending jobs
    // The actual processing happens in the queue consumer defined in src/index.js
}

/**
 * Update job status in the database
 */
export async function updateJobStatus(jobId, status, env, additionalData = {}) {
    const updates = ['status = ?', 'updated_at = ?'];
    const params = [status, Date.now()];

    if (additionalData.output_url) {
        updates.push('output_url = ?');
        params.push(additionalData.output_url);
    }

    if (additionalData.emotion) {
        updates.push('emotion = ?');
        params.push(additionalData.emotion);
    }

    if (additionalData.error) {
        updates.push('error = ?');
        params.push(additionalData.error);
    }

    if (status === 'completed') {
        updates.push('completed_at = ?');
        params.push(Date.now());
    }

    params.push(jobId);

    await env.DB.prepare(
        `UPDATE ai_jobs SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();
}

/**
 * Send a job to the queue
 */
export async function enqueueJob(jobData, env) {
    if (!env.AI_QUEUE) {
        console.warn('[Queue] AI_QUEUE not available, processing synchronously');
        return null;
    }

    const jobId = jobData.jobId || crypto.randomUUID();

    await env.AI_QUEUE.send({
        id: jobId,
        ...jobData,
        queued_at: Date.now()
    });

    console.log(`[Queue] Job ${jobId} enqueued`);
    return jobId;
}

/**
 * Process a single job from the queue
 */
export async function processJob(message, env) {
    const job = message.body;
    const jobId = job.id || job.jobId;

    console.log(`[Queue] Processing job ${jobId}`);

    try {
        // Update status to processing
        await updateJobStatus(jobId, 'processing', env);

        // Run the full AI pipeline
        const result = await runFullPipeline(job, env);

        // Update status to completed
        await updateJobStatus(jobId, 'completed', env, {
            output_url: result.url,
            emotion: job.emotion
        });

        console.log(`[Queue] Job ${jobId} completed successfully`);

        // Send webhook notification if provided
        if (job.webhook_url) {
            await sendWebhook(job.webhook_url, {
                job_id: jobId,
                status: 'completed',
                output_url: result.url,
                emotion: job.emotion
            });
        }

        return { success: true, result };
    } catch (error) {
        console.error(`[Queue] Job ${jobId} failed:`, error);

        // Update status to failed
        await updateJobStatus(jobId, 'failed', env, {
            error: error.message
        });

        // Send webhook notification if provided
        if (job.webhook_url) {
            await sendWebhook(job.webhook_url, {
                job_id: jobId,
                status: 'failed',
                error: error.message
            });
        }

        return { success: false, error: error.message };
    }
}

/**
 * Send webhook notification
 */
async function sendWebhook(url, payload) {
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log(`[Queue] Webhook sent to ${url}`);
    } catch (error) {
        console.error(`[Queue] Failed to send webhook to ${url}:`, error);
    }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(env) {
    const stats = await env.DB.prepare(`
        SELECT 
            status,
            COUNT(*) as count,
            AVG(
                CASE WHEN completed_at IS NOT NULL 
                THEN completed_at - created_at 
                ELSE NULL END
            ) as avg_processing_time_ms
        FROM ai_jobs 
        GROUP BY status
    `).all();

    return stats.results || [];
}

export default {
    async queue(batch, env, ctx) {
        for (const message of batch.messages) {
            ctx.waitUntil(processJob(message, env));
        }
    }
};