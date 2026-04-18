const apiEndpoint = 'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM';
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

    console.log(`Response status: ${response.status}`);
    console.log(`Response content type: ${response.headers.get('content-type')}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error(errorText);
      return;
    }

    if (response.headers.get('content-type') !== 'audio/mpeg') {
      const errorText = await response.text();
      console.error(`Error: Unexpected content type: ${response.headers.get('content-type')}`);
      console.error(errorText);
      return;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      console.error('Error: Empty audio buffer');
      return;
    }

    const fs = require('fs');
    fs.writeFileSync('test.mp3', Buffer.from(buffer));
    console.log('Audio file saved successfully!');
    console.log(`File size: ${buffer.byteLength} bytes`);
  } catch (error) {
    console.error('Error:', error);
  }
}

testElevenLabsVoiceGeneration();
