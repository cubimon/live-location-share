const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors()); // Allows Leaflet frontend to talk to this API
app.use(bodyParser.json());

const pool = new Pool({
	user: 'cubimon',
	host: 'localhost',
	database: 'cubimon',
	port: 5432,
});

pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err);
	process.exit(-1);
});

app.post('/log', async (req, res) => {
	console.log('incoming log event');
	const { s, lat, lon, time } = req.query;

	const query = `
        INSERT INTO user_locations (user_id, geom, updated_at)
        VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326), $4)
        ON CONFLICT (user_id) DO UPDATE 
        SET geom = EXCLUDED.geom, updated_at = EXCLUDED.updated_at;
    `;

	try {
		await pool.query(query, [user, lon, lat, time]);
		console.log(`Updated location for ${user}`);
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

app.listen(8080, () => console.log('Backend running on port 8080')).on('error', (err) => {
	if (err.code === 'EADDRINUSE') {
		console.error('Port 8080 is busy. Try a different port!');
	} else {
		console.error('Server error:', err);
	}
});
