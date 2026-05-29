const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  const res = await client.query('SELECT id, passenger_name, status, company_id FROM tickets LIMIT 10;');
  console.log("Found tickets:", res.rows);
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
