import WebSocket from 'ws';

const API_KEY = 'AIzaSyA1kjxuM7BEoaG3vyZLkT9ESW8tnD9HIZg';
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

console.log('Testing PRODUCTION configuration (AUDIO only, v1alpha)...');

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('WebSocket connected!');

  // EXACT production configuration
  const setupMessage = {
    setup: {
      model: 'models/gemini-2.0-flash-exp',
      generation_config: {
        response_modalities: ['AUDIO'],  // AUDIO only - TEXT causes errors!
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: 'Aoede',
            },
          },
        },
      },
      system_instruction: {
        parts: [{ text: 'You are a calm meditation guide.' }],
      },
    },
  };

  console.log('Sending setup...');
  ws.send(JSON.stringify(setupMessage));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('Response:', JSON.stringify(msg).substring(0, 400));

  if (msg.setupComplete) {
    console.log('SUCCESS! Connection established.');
    ws.close();
    process.exit(0);
  }
});

ws.on('close', (code, reason) => {
  console.log('Closed:', code, reason.toString().substring(0, 300));
  process.exit(code === 1000 ? 0 : 1);
});

ws.on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

setTimeout(() => { console.error('Timeout'); process.exit(1); }, 10000);
