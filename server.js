const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const basicAuth = require('express-basic-auth');


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
app.use('/api/user/', basicAuth({
    users: users,
    challenge: true // Triggers the browser login prompt
}));
app.use(cors()); // Allows Leaflet frontend to talk to this API
app.use(bodyParser.json());

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

app.post('/api/user/log', async (req, res) => {
	console.log('incoming log event');
	const { s, lat, lon, time } = req.query;

	const query = `
        INSERT INTO user_locations (user_id, geom, updated_at)
        VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326), $4)
        ON CONFLICT (user_id) DO UPDATE 
        SET geom = EXCLUDED.geom, updated_at = EXCLUDED.updated_at;
    `;

	try {
		await pool.query(query, [httpUser, lon, lat, time]);
		console.log(`Updated location for ${httpUser}`);
		res.status(200).send("OK");
	} catch (err) {
		console.error("DB Error:", err);
		res.status(500).send("Error saving data");
	}
});

app.get('/api/locations', async (req, res) => {
	const query = `
        SELECT 
            user_id, 
            ST_X(geom::geometry) as lng, 
            ST_Y(geom::geometry) as lat, 
            updated_at 
        FROM user_locations;
    `;

	try {
		const result = await pool.query(query);
		res.json(result.rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.listen(serverPort, () => console.log('Backend running on port ' + serverPort)).on('error', (err) => {
	if (err.code === 'EADDRINUSE') {
		console.error('Port ' + serverPort + ' is busy. Try a different port!');
	} else {
		console.error('Server error:', err);
	}
});
