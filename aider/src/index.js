curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/WY0rHxCdMd9mgNzpBFrg" \
  -H "xi-api-key: sk_ae749ba4dc808e6c929c481967a4ad5fac3d749cc97035d1" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test of CronAi Aethel voice generation.",
    "model_id": "WY0rHxCdMd9mgNzpBFrg"
  }' \
  --output test.mp3
