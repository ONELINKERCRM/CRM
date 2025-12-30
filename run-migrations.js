import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
    host: 'db.xtxfhccxpvhnrgzephah.supabase.co',
    port: 6543, // Supabase uses port 6543 for pooler, 5432 for direct
    database: 'postgres',
    user: 'postgres.xtxfhccxpvhnrgzephah',
    password: 'Bloch@5529741',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
});

async function runMigrations() {
    try {
        console.log('🔌 Connecting to new Supabase database...');
        await client.connect();
        console.log('✅ Connected successfully!\n');

        const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log(`📦 Found ${files.length} migration files\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const file of files) {
            try {
                console.log(`⏳ Running: ${file}`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                await client.query(sql);
                console.log(`✅ Completed: ${file}\n`);
                successCount++;
            } catch (error) {
                console.error(`❌ Error in ${file}:`);
                console.error(`   ${error.message}\n`);
                errorCount++;
                // Continue with next migration
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`🎉 Migration Summary:`);
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Failed: ${errorCount}`);
        console.log(`   📊 Total: ${files.length}`);
        console.log('='.repeat(60) + '\n');

        if (successCount > 0) {
            console.log('✨ Your new database is ready!');
            console.log('🔗 You can now use your application with the new Supabase project.\n');
        }
    } catch (error) {
        console.error('❌ Connection error:', error.message);
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Check if your database password is correct');
        console.error('   2. Verify the project is not paused in Supabase dashboard');
        console.error('   3. Check your internet connection');
        console.error('   4. Try running migrations manually in Supabase SQL Editor\n');
    } finally {
        await client.end();
    }
}

runMigrations();
