import pg from 'pg'
const { Pool, Client } = pg
const connectionString = process.env.DATABASE_URL
 
const pool = new Pool({
  connectionString,
})
  
const client = new Client({
  connectionString,
})
 
await client.connect()
 
await client.query('SELECT NOW()')
 
await client.end()
