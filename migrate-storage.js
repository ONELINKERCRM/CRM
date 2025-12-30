import { createClient } from '@supabase/supabase-js';

const OLD_URL = 'https://zyqlwkkiyuqnhlvnuewk.supabase.co';
const OLD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cWx3a2tpeXVxbmhsdm51ZXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODYzMzAsImV4cCI6MjA4MTA2MjMzMH0.TN_kg25BJ90dv_82Iw1be4lXSti9EFFGC7rJvpPMp2I';

const NEW_URL = 'https://xtxfhccxpvhnrgzephah.supabase.co';
// Using Service Role Key to bypass RLS during migration
const NEW_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0eGZoY2N4cHZobnJnemVwaGFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NzkzOCwiZXhwIjoyMDgyNTIzOTM4fQ.6xEirijEdvQUt2JI4c7GnPqdpANzuHn5JqJQhiGEkKA';

const oldClient = createClient(OLD_URL, OLD_ANON_KEY);
const newClient = createClient(NEW_URL, NEW_SERVICE_ROLE_KEY);

async function listAllFiles(bucket, path = '') {
    const { data: items, error } = await oldClient.storage
        .from(bucket)
        .list(path, { limit: 100, offset: 0 });

    if (error) {
        console.error(`Error listing path '${path}' in bucket '${bucket}':`, error.message);
        return [];
    }

    let files = [];
    for (const item of items) {
        if (item.name === '.emptyFolderPlaceholder') continue;

        // Check if it's a folder (no id usually means folder in Supabase storage list)
        if (!item.id) {
            const subFiles = await listAllFiles(bucket, `${path}${item.name}/`);
            files = [...files, ...subFiles];
        } else {
            files.push({ ...item, fullPath: `${path}${item.name}` });
        }
    }
    return files;
}

async function migrateBucket(bucketName) {
    console.log(`\n-----------------------------------`);
    console.log(`Migrating bucket: ${bucketName}`);

    try {
        const { error: createError } = await newClient.storage.createBucket(bucketName, { public: true });
        if (createError && !createError.message.includes('already exists')) {
            console.log(`Bucket creation note: ${createError.message}`);
        }
    } catch (e) {
        // Ignore already exists
    }

    const files = await listAllFiles(bucketName);
    console.log(`Found ${files.length} files to migrate.`);

    for (const file of files) {
        try {
            console.log(`Downloading: ${file.fullPath}...`);
            const { data: blob, error: downloadError } = await oldClient.storage
                .from(bucketName)
                .download(file.fullPath);

            if (downloadError) throw new Error(`Download failed: ${downloadError.message}`);

            console.log(`Uploading: ${file.fullPath}...`);
            const { error: uploadError } = await newClient.storage
                .from(bucketName)
                .upload(file.fullPath, blob, { upsert: true });

            if (uploadError) {
                // If 403, specifically mention it might be RLS
                if (uploadError.statusCode === '403' || uploadError.message.includes('unauthorized')) {
                    throw new Error(`Upload failed (ACCESS DENIED). You likely need the SERVICE_ROLE_KEY instead of the Anon Key. Error: ${uploadError.message}`);
                }
                throw new Error(`Upload failed: ${uploadError.message}`);
            }

            console.log(`✓ Success: ${file.fullPath}`);
        } catch (err) {
            console.error(`✗ Error on ${file.fullPath}:`, err.message);
        }
    }
}

async function migrate() {
    const buckets = ['property-media', 'property-pdfs', 'company-assets', 'avatars', 'leads'];

    console.log("Starting Migration...");

    for (const bucket of buckets) {
        await migrateBucket(bucket);
    }

    console.log('\n✅ Storage migration process finished.');
}

migrate();
