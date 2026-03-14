import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function applyMigration() {
  try {
    await client.connect();
    console.log('Connected to database');

    const sql = fs.readFileSync('/tmp/cc-agent/62206596/project/financial_obra_migration.sql', 'utf8');
    
    await client.query(sql);
    console.log('Migration applied successfully');
    
    await client.end();
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
