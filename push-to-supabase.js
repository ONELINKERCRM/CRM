import fetch from 'node-fetch';
import fs from 'fs';

const SUPABASE_PROJECT_REF = 'xtxfhccxpvhnrgzephah';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const DB_PASSWORD = 'Bloch@5529741';

async function executeSQLDirect() {
    try {
        console.log('📖 Reading migration file...');
        const sql = fs.readFileSync('COMPLETE_MIGRATION.sql', 'utf8');

        console.log(`✅ Loaded ${sql.length} characters of SQL\n`);
        console.log('🚀 Executing SQL via Supabase Management API...\n');

        const response = await fetch(
            `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: sql
                })
            }
        );

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Migration executed successfully!');
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.error('❌ Migration failed:');
            console.error(JSON.stringify(result, null, 2));

            // Try alternative method using psql connection string
            console.log('\n💡 Trying alternative method with direct database connection...');
            await executeSQLViaPSQL(sql);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n💡 Trying alternative method...');
        const sql = fs.readFileSync('COMPLETE_MIGRATION.sql', 'utf8');
        await executeSQLViaPSQL(sql);
    }
}

async function executeSQLViaPSQL(sql) {
    const { Client } = await import('pg');

    // Try different connection configurations
    const configs = [
        {
            connectionString: `postgresql://postgres.xtxfhccxpvhnrgzephah:${DB_PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
            ssl: { rejectUnauthorized: false }
        },
        {
            host: 'aws-0-ap-south-1.pooler.supabase.com',
            port: 6543,
            database: 'postgres',
            user: 'postgres.xtxfhccxpvhnrgzephah',
            password: DB_PASSWORD,
            ssl: { rejectUnauthorized: false }
        },
        {
            host: 'db.xtxfhccxpvhnrgzephah.supabase.co',
            port: 5432,
            database: 'postgres',
            user: 'postgres',
            password: DB_PASSWORD,
            ssl: { rejectUnauthorized: false }
        }
    ];

    for (let i = 0; i < configs.length; i++) {
        try {
            console.log(`\n🔌 Attempting connection method ${i + 1}/${configs.length}...`);
            const client = new Client(configs[i]);

            await client.connect();
            console.log('✅ Connected to database!');

            console.log('📝 Executing migration SQL...');
            await client.query(sql);

            console.log('\n🎉 Migration completed successfully!');
            await client.end();
            return;
        } catch (error) {
            console.error(`❌ Method ${i + 1} failed:`, error.message);
            if (i === configs.length - 1) {
                throw new Error('All connection methods failed');
            }
        }
    }
}

executeSQLDirect();
