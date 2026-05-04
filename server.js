const express = require('express');
const http = require('http');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const basicAuth = require('express-basic-auth');
const { WebSocketServer } = require('ws');
const path = require('path');


const serverPort = process.env.SERVER_PORT ?? 3000;
const httpUser = process.env.USER ?? 'user';
const httpUserPassword = process.env.USER_PASSWORD ?? 'secret';
const dbUser = process.env.DB_USER ?? 'postgres';
const dbPassword = process.env.DB_PASSWORD ?? 'postgres';
const dbHost = process.env.DB_HOST ?? 'localhost';
const dbDatabase = process.env.DB_DATABASE ?? 'postgres';
const dbPort = process.env.DB_PORT ?? 5432;

const users = {};
users[httpUser] = httpUserPassword;

const app = express();
const server = http.createServer(app);
// app.use('/log', basicAuth({
//     users: users,
//     challenge: true // Triggers the browser login prompt
// }));
app.use(cors()); // Allows Leaflet frontend to talk to this API
app.use(bodyParser.json());
app.use('/leaflet', express.static(path.join(__dirname, 'node_modules/leaflet/dist')));

const pool = new Pool({
    user: dbUser,
    password: dbPassword,
    host: dbHost,
    database: dbDatabase,
    port: dbPort,
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

wss.on('connection', async (ws) => {
    clients.add(ws);
    console.log('Viewer connected via WebSocket');
    ws.on('close', () => clients.delete(ws));
    const result = await readHistory();
    ws.send(JSON.stringify(result.rows));
});

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

app.post('/log', async (req, res) => {
    console.log('incoming log event');
    const deviceId = req.body.device_id;
    const latitude = req.body.location.coords.latitude;
    const longitude = req.body.location.coords.longitude;
    const speed = req.body.location.coords.speed;
    const accuracy = req.body.location.coords.accuracy;
    const battery = req.body.location.battery.level;
    // const timestamp = req.body.location.timestamp;

    await pool.query(
        `INSERT INTO user_locations (user_id, geom, speed, accuracy, battery, device_id, updated_at) 
         VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7, NOW())`,
        [httpUser, longitude, latitude, speed || 0, accuracy || 0, battery || 0, deviceId]
    );

    // Broadcast to all WebSocket clients
    const payload = JSON.stringify(
        [
            {
                user: httpUser,
                latitude: Number.parseFloat(latitude),
                longitude: Number.parseFloat(longitude),
                speed: speed,
                battery: battery,
                accuracy: accuracy
            }
        ]
    );

    clients.forEach(client => {
        if (client.readyState === 1) client.send(payload);
    });

    console.log(`Updated location for ${httpUser}`);
    res.status(200).send("OK");
});

app.get('/history', async (req, res) => {
    try {
        // This gets the last 100 points for a user
        // Note: You'll need a table with a history of points, 
        // not just the "ON CONFLICT UPDATE" table we made earlier.
        const result = await readHistory();
        res.json(result.rows);
    } catch (err) {
        res.sendStatus(500);
    }
});

async function readHistory() {
    return await pool.query(
        `SELECT
            ST_X(geom::geometry) as longitude,
            ST_Y(geom::geometry) as latitude,
            speed,
            accuracy,
            battery,
            device_id
        FROM user_locations
        WHERE user_id = $1
        ORDER BY updated_at DESC LIMIT 100`,
        [httpUser]
    );
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(serverPort, () => console.log('Backend running on port ' + serverPort)).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error('Port ' + serverPort + ' is busy. Try a different port!');
    } else {
        console.error('Server error:', err);
    }
});
