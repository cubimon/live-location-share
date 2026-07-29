import { Pool } from 'pg';

const sql = `
CREATE TABLE IF NOT EXISTS user_locations (
    user_id VARCHAR(50),
    geom GEOGRAPHY(Point, 4326),
    updated_at TIMESTAMP
);

ALTER TABLE user_locations
    ADD COLUMN IF NOT EXISTS speed NUMERIC,
    ADD COLUMN IF NOT EXISTS battery NUMERIC,
    ADD COLUMN IF NOT EXISTS accuracy NUMERIC,
    ADD COLUMN IF NOT EXISTS altitude NUMERIC,
    ADD COLUMN IF NOT EXISTS device_id VARCHAR(32),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ,
    DROP COLUMN IF EXISTS updated_at;
`;

/**
 * @param {Pool} pool
 */
export async function migrate(pool) {
  console.log('migrating database');
  await pool.query(sql);
}

