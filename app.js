import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import bodyParser from 'body-parser';
import { WebSocketServer } from 'ws';
import path from 'path';

import { paginate } from './middleware/paginate.js';
import { migrate } from './migrations.js';

process.loadEnvFile('.env');

const deviceIds = (process.env.DEVICE_IDS ?? '').split(',');
const dbUser = process.env.DB_USER ?? 'postgres';
const dbPassword = process.env.DB_PASSWORD ?? 'postgres';
const dbHost = process.env.DB_HOST ?? 'localhost';
const dbDatabase = process.env.DB_DATABASE ?? 'postgres';
const dbPort = process.env.DB_PORT ?? 5432;

console.log('deviceIds: ' + JSON.stringify(deviceIds));

export const app = express();
app.use(cors()); // Allows Leaflet frontend to talk to this API
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(paginate());
app.use('/leaflet', express.static(path.join(import.meta.dirname, 'node_modules/leaflet/dist')));

export const pool = new Pool({
  user: dbUser,
  password: dbPassword,
  host: dbHost,
  database: dbDatabase,
  port: dbPort,
});

pool.on('error', (err, _client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

migrate(pool);

const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

wss.on('connection', async (ws) => {
  clients.add(ws);
  console.log('Viewer connected via WebSocket');
  ws.on('close', () => clients.delete(ws));
});

app.post('/log', async (req, res) => {
  console.log('incoming log event');
  console.log('url: ' + req?.url);
  console.log('headers: ' + JSON.stringify(req?.headers));
  console.log('body: ' + JSON.stringify(req?.body));
  console.log('query: ' + JSON.stringify(req?.query));
  const user = process.env.USER;
  const deviceId = req.body?.id ?? 'unknown';
  const latitude = req.body.lat;
  const longitude = req.body.lon;
  const altitude = req.body.altitude;
  const speed = req.body?.speed || 0; // not always part of request body
  const accuracy = req.body.accuracy || 0;
  const battery = req.body.batt || 0;
  let timestamp = new Date();
  if (req.body.timestamp) {
    timestamp = new Date(parseInt(req.body.timestamp))
  }
  if (deviceIds.indexOf(deviceId) < 0) {
      console.warn('unknown device id: ' + deviceId);
      return;
  }

  try {
    await pool.query(`
        INSERT INTO user_locations (
            user_id,
            geom, altitude, speed, accuracy,
            battery, device_id,
            timestamp)
        VALUES (
            $1,
            ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6,
            $7, $8,
            $9)`, [
            user,
            longitude, latitude, altitude, speed, accuracy,
            battery, deviceId,
            timestamp
        ]);
  } catch (err) {
    console.error(err);
  }

  // Broadcast to all WebSocket clients
  const payload = JSON.stringify(
      [
          {
              user: user,
              latitude: Number.parseFloat(latitude),
              longitude: Number.parseFloat(longitude),
              battery: battery,
              accuracy: accuracy
          }
      ]
  );

  console.log(clients.size + ' clients connected');
  clients.forEach(client => {
      if (client.readyState === 1) client.send(payload);
  });

  console.log(`Updated location for ${user}`);
  res.status(200).send('OK');
});

app.get('/groups', async (_req, res) => {
  try {
    const result = await getGroups();
    res.json(result.rows);
  } catch (err) {
    console.error(err);
  }
});

app.post('/groups', async (req, res) => {
  const name = req.body?.name;
  const description = req.body?.description;
  if (!name) {
    console.warn('cannot create group without name');
    return;
  }
  try {
    const result = await createGroup(name, description);
    const groupId = result.rows[0].id;
    await addUnassignedUserLocationsToGroup(groupId)
    res.status(200).send(groupId);
  } catch (err) {
    console.error(err);
  }
});

app.get('/groups/:groupId/points', async (req, res) => {
  let groupId = req.params.groupId;
  if (groupId == 0) {
    groupId = null;
  }
  try {
    const result = await getGroupPoints(
      groupId, req.pagination.limit, req.pagination.skip);
    const groupPoints = result.rows;
    res.status(200).send(groupPoints);
  } catch (err) {
    console.error(err);
  }
});

async function getGroups() {
  return await pool.query(
      `SELECT
          id,
          name,
          description,
          created_at
      FROM location_groups`);
}

async function createGroup(name, description) {
  return await pool.query(
      `INSERT INTO location_groups(name, description)
      VALUES ($1, $2)
      RETURNING id`,
      [name, description]);
}

async function getGroupPoints(groupId, limit, skip) {
  return await pool.query(
      `SELECT
          ST_X(geom::geometry) as longitude,
          ST_Y(geom::geometry) as latitude,
          speed,
          accuracy,
          battery
          device_id,
          created_at
      FROM user_locations
      WHERE group_id IS NOT DISTINCT FROM $1
      ORDER BY created_at desc
      LIMIT $2 OFFSET $3`,
      [groupId, limit, skip]);
}

async function addUnassignedUserLocationsToGroup(groupId) {
  await pool.query(
      `UPDATE user_locations
      set group_id = $1
      WHERE group_id is null`,
      [groupId]);
}

app.get('/', (_req, res) => {
  res.sendFile(path.join(import.meta.dirname, 'index.html'));
});

