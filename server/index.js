const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client setup
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
  // only use SSL in production; fix the typo
 // ssl:
   // process.env.NODE_ENV !== 'production'
     // ? false
      //: { rejectUnauthorized: false },
});

pgClient.on('connect', (client) => {
  client
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.error('PG init error:', err));
});

// Redis client setup (node-redis v3 style)
const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
const redisPublisher = redisClient.duplicate();

// --- Routes ---

app.get('/', (_req, res) => {
  res.send('Hi There!');
});

// All seen indexes (from Postgres)
app.get('/values/all', async (_req, res) => {
  try {
    const values = await pgClient.query('SELECT number FROM values ORDER BY number ASC');
    res.send(values.rows);
  } catch (err) {
    console.error('PG /values/all error:', err);
    res.status(500).send({ error: 'Failed to fetch values' });
  }
});

// CURRENT computed values (from Redis)
// NOTE: you were missing the leading slash before
app.get('/values/current', (_req, res) => {
  redisClient.hgetall('values', (err, values) => {
    if (err) {
      console.error('Redis hgetall error:', err);
      return res.status(500).send({ error: 'Failed to fetch current values' });
    }
    res.send(values || {});
  });
});

// Submit new index
app.post('/values', async (req, res) => {
  const { index } = req.body || {};

  // Normalize & validate input to prevent '' inserts
  const n = parseInt(index, 10);
  if (!Number.isInteger(n)) {
    return res.status(400).send('Index must be an integer.');
  }
  if (n < 0) {
    return res.status(422).send('Index must be >= 0.');
  }
  if (n > 40) {
    // keep worker safe
    return res.status(422).send('Index too high.');
  }

  // Set placeholder in Redis; worker will compute
  redisClient.hset('values', String(n), 'Nothing Yet');
  // Notify worker
  redisPublisher.publish('insert', String(n));

  // Persist that we’ve seen this index in Postgres
  try {
    await pgClient.query('INSERT INTO values(number) VALUES($1)', [n]);
  } catch (err) {
    console.error('PG INSERT error:', err);
    // don’t fail the whole request for a PG hiccup; but you can choose to
  }

  res.send({ working: true });
});

app.listen(5000, () => {
  console.log('Listening on 5000');
});
