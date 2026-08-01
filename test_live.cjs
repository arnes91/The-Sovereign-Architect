const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('Connected to server! Sending setup packet...');
  ws.send(JSON.stringify({
    type: 'setup',
    voice: 'Kore',
    systemPrompt: 'You are Miku, a sassy AI.',
    memory: ''
  }));
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('close', (code, reason) => {
  console.log('Connection closed:', code, reason.toString());
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('WebSocket Error:', err);
});
