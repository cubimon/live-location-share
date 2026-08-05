import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { app, pool } from './app.js';

async function resetDatabase() {
  await pool.query(`
    TRUNCATE TABLE user_locations, location_groups RESTART IDENTITY CASCADE;
  `);
}

beforeAll(async () => {
  // Ensure we are operating on the test database
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Tests must run with NODE_ENV=test!');
  }
  await resetDatabase();
});

//afterEach(async () => {
//  // Reset data between individual test cases so tests stay isolated
//  await resetDatabase();
//});
//
//afterAll(async () => {
//  // Close database connection pool when tests finish
//  await pool.end();
//});

describe('add some points and group', () => {
  it('add some points', async () => {
    const point = {
      id: '123',
      lat: 50,
      lon: 10,
      altitude: 10,
      speed: 1,
      accuracy: 2,
      batt: 74
    };
    for (const pos of [1, 2, 3]) {
      point.lat = 50 + pos;
      const result = await request(app)
        .post('/log')
        .send(point);
      expect(result.status).toBe(200);
    }
  });
  it('group points', async () => {
    const group = {
      name: 'test'
    };
    const result = await request(app)
      .post('/groups')
      .send(group);
    expect(result.status).toBe(200);
  });
  it('list groups', async () => {
    const result = await request(app)
      .get('/groups')
      .send();
    expect(result.status).toBe(200);
    expect(result.body).toHaveLength(1);
    expect(result.body[0]?.created_at).toBeDefined();
    expect(result.body[0]?.name).equals('test');
  });
  it('get group points', async () => {
    const result = await request(app)
      .get('/groups/1/points')
      .send();
    expect(result.status).toBe(200);
    expect(result.body).toHaveLength(3);
    result.body.forEach(a => delete a['created_at']);
    expect(result.body).toEqual([
      {
        longitude: 10,
        latitude: 53,
        speed: '1',
        accuracy: '2',
        device_id: '74'
      },
      {
        longitude: 10,
        latitude: 52,
        speed: '1',
        accuracy: '2',
        device_id: '74'
      },
      {
        longitude: 10,
        latitude: 51,
        speed: '1',
        accuracy: '2',
        device_id: '74'
      }
    ]);
  })
});
