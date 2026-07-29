import { Pool } from 'pg';

const sql = `
CREATE TABLE IF NOT EXISTS user_locations (
    user_id VARCHAR(50),
    geom GEOGRAPHY(Point, 4326),
    updated_at TIMESTAMP
);

ALTER TABLE user_locations DROP CONSTRAINT if exists user_locations_pkey;
ALTER TABLE user_locations
    ADD COLUMN IF NOT EXISTS speed NUMERIC,
    ADD COLUMN IF NOT EXISTS battery NUMERIC,
    ADD COLUMN IF NOT EXISTS accuracy NUMERIC,
    ADD COLUMN IF NOT EXISTS altitude NUMERIC,
    ADD COLUMN IF NOT EXISTS device_id VARCHAR(32),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ,
    DROP COLUMN IF EXISTS updated_at,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS id BIGINT GENERATED ALWAYS AS IDENTITY,
    ADD CONSTRAINT user_locations_pkey PRIMARY KEY(id);
`;

/**
 * @param {Pool} pool
 */
export async function migrate(pool) {
  console.log('migrating database');
  await pool.query(sql);
}

