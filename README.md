# CronAi Aethel

An emotion-driven video generation platform for solopreneurs and Web3 founders.

## Overview

CronAi Aethel allows users to create personalized 30-second cinematic videos by uploading:
- 10-15 face photos (for face hashing/consistency)
- 11-second voice sample (for voice cloning)
- A script (text they want to speak)
- Logo (optional, for branding)

The system generates a video with:
- The user's face (consistent across frames)
- The user's cloned voice speaking the script
- Cinematic B-roll matching the script's emotion
- Background music
- Logo overlay

## Technical Stack

- **Platform**: Cloudflare Workers (deployment)
- **AI APIs**: fal.ai (video, voice, music)
- **Storage**: Cloudflare R2 (assets, final videos)
- **Database**: Cloudflare D1 (SQLite)
- **Caching**: Cloudflare KV
- **Assembly**: FFmpeg via external sandbox
- **Face Embedding**: InsightFace (via fal.ai)
- **Voice Cloning**: fal.ai - Chatterbox HD
- **Video Generation**: fal.ai - Wan 2.5
- **Music Generation**: fal.ai - MiniMax Music v2
- **Orchestration**: Cloudflare Queues (async processing)

## Project Structure

```
cronai-aethel/
├── src/
│   └── index.js              # Main Cloudflare Worker entry point
├── backend/
│   ├── routes/               # API route handlers
│   │   ├── auth.js           # Authentication routes
│   │   ├── users.js          # User management routes
│   │   ├── videos.js         # Video management routes
│   │   ├── payments.js       # Payment processing routes
│   │   ├── subscriptions.js  # Subscription management routes
│   │   ├── affiliates.js     # Affiliate program routes
│   │   ├── tokens.js         # API token management routes
│   │   ├── aiJobs.js         # AI job status routes
│   │   ├── admin.js          # Admin dashboard routes
│   │   └── ai.js             # AI analysis routes
│   ├── services/
│   │   └── emailService.js   # Email notification service
│   ├── jobs/
│   │   └── aiJobQueue.js     # Queue processor for AI jobs
│   └── migrations/
│       └── 001_initial_schema.sql  # Database schema
├── frontend/                 # React frontend (separate deployment)
├── aiPipelineService.js      # Core AI pipeline implementation
├── wrangler.toml             # Cloudflare Workers configuration
├── package.json              # Node.js dependencies
└── .env.example              # Environment variables template
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account with Workers enabled
- fal.ai API key
- DeepSeek API key (or alternative LLM)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/cronai-aethel/cronai-aethel.git
cd cronai-aethel
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .dev.vars
# Edit .dev.vars with your API keys
```

4. Set up secrets (for production):
```bash
wrangler secret put FAL_KEY
wrangler secret put DEEPSEEK_API_KEY
wrangler secret put INTERNAL_KEY
wrangler secret put FFMPEG_SANDBOX_URL
wrangler secret put SENTRY_DSN
```

5. Initialize the database:
```bash
npm run db:migrate
```

### Development

Start the local development server:
```bash
npm run dev
```

The API will be available at `http://localhost:8787`

### Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## API Reference

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### Video Generation

- `POST /api/generate` - Start video generation
- `GET /api/videos` - List videos
- `GET /api/videos/:id` - Get video details
- `GET /api/videos/:id/download` - Get download URL
- `DELETE /api/videos/:id` - Delete a video

### AI Jobs

- `GET /api/ai-jobs` - List user's AI jobs
- `GET /api/ai-jobs/:id` - Get job details
- `GET /api/ai-jobs/:id/status` - Get job status
- `POST /api/ai-jobs/:id/cancel` - Cancel a job

### AI Analysis

- `GET /api/ai/emotions` - Get available emotions
- `POST /api/ai/analyze-script` - Analyze script emotion
- `POST /api/ai/generate-prompt` - Generate video prompt
- `GET /api/ai/voice-options` - Get voice options
- `POST /api/ai/validate-assets` - Validate upload assets

### Subscriptions

- `GET /api/subscriptions/me` - Get user subscription
- `POST /api/subscriptions/upgrade` - Upgrade plan
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/subscriptions/use-credit` - Use video credit
- `GET /api/subscriptions/plans` - Get available plans

## AI Pipeline Phases

### Phase 1: Face Processing (Face Hashing)
Extracts face embeddings from 10-15 photos and creates a master embedding.

### Phase 2: Voice Processing
Clones user's voice from an 11-second audio sample.

### Phase 3: Emotion Detection & Prompt Generation
Analyzes script for emotional tone and generates video prompts.

### Phase 4: Video Generation
Generates video using Wan 2.5 with face consistency.

### Phase 5: Voice Generation
Generates voiceover using cloned voice.

### Phase 6: Music Generation
Generates background music matching the emotion.

### Phase 7: Assembly (FFmpeg)
Combines all elements into final video.

### Phase 8: Orchestration
Manages the entire pipeline via Cloudflare Queues.

## Emotion Categories

| Emotion | Description | Camera | Lighting | Music |
|---------|-------------|--------|----------|-------|
| Excitement | High energy, enthusiastic | Dynamic movement | Bright, high contrast | Cinematic orchestral |
| Trust | Professional, reliable | Static or slow pan | Soft, diffused | Soft piano, warm |
| Urgency | Time-sensitive | Quick cuts | Dramatic | Pulsing synth |
| Curiosity | Intriguing | Slow reveal | Moody, focused | Glitchy electronics |
| Desire | Aspirational | Smooth movements | Warm, golden | Smooth soul |

## Subscription Plans

| Plan | Price | Videos/Month | Features |
|------|-------|--------------|----------|
| Free | $0 | 3 | 720p, Basic emotions, Watermarked |
| Pro | $29 | 30 | 1080p, All emotions, No watermark |
| Enterprise | $99 | 100 | 4K, Custom emotions, API access |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

For support, email support@cronai-aethel.com or join our Discord community.

---

Built with ❤️ by the CronAi Aethel Team