const apiEndpoint = 'https://api.elevenlabs.io/v1/text-to-speech/WY0rHxCdMd9mgNzpBFrg';
const apiKey = 'sk_7cc5d72c03ee567517cc9a93416d86fe8b9a196c364fb328';

async function testElevenLabsVoiceGeneration() {
  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({ text: 'Hello, this is a test of CronAi Aethel voice generation.' }),
    });

    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error(await response.text());
      return;
    }

    const contentType = response.headers.get('Content-Type');
    if (contentType !== 'audio/mpeg') {
      console.error(`Error: Unexpected content type: ${contentType}`);
      return;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength