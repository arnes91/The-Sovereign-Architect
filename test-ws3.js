import WebSocket from 'ws';
const ws = new WebSocket('ws://localhost:3000/live');
ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'setup', model: 'gemini-2.5-flash', systemPrompt: 'test', memory: '' }));
});
ws.on('message', (data) => {
  console.log("Message:", data.toString());
});
ws.on('close', () => console.log('Closed'));
ws.on('error', (e) => console.log('Error', e.message));
