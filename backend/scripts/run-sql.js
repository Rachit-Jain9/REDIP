require('dotenv').config({ override: process.env.NODE_ENV !== 'production' });

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DEV_DATABASE_URL = 'postgresql://postgres:password@localhost:5432/redevint';

const isPlaceholderValue = (value) => !value || /your[_-]/i.test(value);

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: node scripts/run-sql.js <sql-file>');
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), inputPath);

if (!fs.existsSync(filePath)) {
  console.error(`SQL file not found: ${filePath}`);
  process.exit(1);
}

const databaseUrl =
  process.env.NODE_ENV === 'production'
    ? process.env.DATABASE_URL
    : isPlaceholderValue(process.env.DATABASE_URL)
      ? DEV_DATABASE_URL
      : process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured.');
  process.exit(1);
}

const sql = fs.readFileSync(filePath, 'utf8');

async function run() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log(`Executed SQL file: ${filePath}`);
  } catch (error) {
    console.error(`Failed to execute SQL file: ${filePath}`);
    console.error(error.message || error.code || error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

run();
