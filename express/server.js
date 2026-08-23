import http from 'http';

import { app, wss } from './app.js';

const serverPort = process.env.SERVER_PORT ?? 3000;
const server = http.createServer(app);

// Handle WebSocket Upgrade on the /ws path
server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});


server.listen(serverPort, () => console.log('Backend running on port ' + serverPort)).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error('Port ' + serverPort + ' is busy. Try a different port!');
    } else {
        console.error('Server error:', err);
    }
});
