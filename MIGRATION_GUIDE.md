# Complete Migration Guide - Onelinker CRM

## ✅ COMPLETED STEPS
1. **Environment Variables Updated** - Your `.env` file now points to the new project
2. **New Project Details Recorded**:
   - Project ID: `xtxfhccxpvhnrgzephah`
   - URL: `https://xtxfhccxpvhnrgzephah.supabase.co`
   - Database Password: `Bloch@5529741`

## 🔄 NEXT STEPS - Database Schema Migration

Since the CLI is having authentication issues, we'll use the **Supabase SQL Editor** directly.

### Step 1: Apply All Migrations to New Project

Go to your new Supabase Dashboard → **SQL Editor** and run these migrations **in order**:

#### 1.1 Run Initial Schema
Open: `supabase/migrations/20240101000000_initial_schema.sql`
Copy the entire file and execute it in SQL Editor.

#### 1.2 Run All Other Migrations
Execute each migration file in chronological order (by filename timestamp):
- `20251214152631_18234576-9e20-4161-a6b8-4f0582997c35.sql`
- `20251218212346_9372f5a2-b548-4e07-a624-23a9d59276ae.sql`
- `20251225180000_lead_assignment_system.sql`
- `20251228230000_fix_listings_columns.sql` (This fixes the Arabic columns issue)
- And all others in the `supabase/migrations/` folder

### Step 2: Migrate Data from Old Project

#### Option A: Using Supabase Dashboard (Recommended for Small Datasets)
1. Go to **OLD project** → Table Editor
2. For each table, export as CSV
3. Go to **NEW project** → Table Editor
4. Import the CSV files

#### Option B: Using pg_dump (Recommended for Large Datasets)
Run this command in PowerShell:

```powershell
# Export data from old project
pg_dump "postgresql://postgres:YOUR_OLD_PASSWORD@db.zyqlwkkiyuqnhlvnuewk.supabase.co:5432/postgres" --data-only --schema=public -f old_data.sql

# Import to new project
psql "postgresql://postgres:Bloch@5529741@db.xtxfhccxpvhnrgzephah.supabase.co:5432/postgres" -f old_data.sql
```

### Step 3: Migrate Auth Users

Run this in PowerShell to preserve user accounts:

```powershell
# Export auth users
pg_dump "postgresql://postgres:YOUR_OLD_PASSWORD@db.zyqlwkkiyuqnhlvnuewk.supabase.co:5432/postgres" --schema=auth -f auth_users.sql

# Import to new project
psql "postgresql://postgres:Bloch@5529741@db.xtxfhccxpvhnrgzephah.supabase.co:5432/postgres" -f auth_users.sql
```

### Step 4: Migrate Storage Files

Create a file `migrate-storage.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://zyqlwkkiyuqnhlvnuewk.supabase.co';
const OLD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cWx3a2tpeXVxbmhsdm51ZXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODYzMzAsImV4cCI6MjA4MTA2MjMzMH0.TN_kg25BJ90dv_82Iw1be4lXSti9EFFGC7rJvpPMp2I';

const NEW_URL = 'https://xtxfhccxpvhnrgzephah.supabase.co';
const NEW_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0eGZoY2N4cHZobnJnemVwaGFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDc5MzgsImV4cCI6MjA4MjUyMzkzOH0.YRwbIm3fMnKu-d6z88ilM6xupefc1F5SZerRD1XXuOU';

const oldClient = createClient(OLD_URL, OLD_ANON_KEY);
const newClient = createClient(NEW_URL, NEW_ANON_KEY);

async function migrateBucket(bucketName) {
  console.log(`\nMigrating bucket: ${bucketName}`);
  
  try {
    // Create bucket in new project if it doesn't exist
    await newClient.storage.createBucket(bucketName, { public: true });
  } catch (e) {
    console.log(`Bucket ${bucketName} already exists or error:`, e.message);
  }

  const { data: files, error } = await oldClient.storage
    .from(bucketName)
    .list('', { limit: 1000, offset: 0 });

  if (error) {
    console.error(`Error listing files in ${bucketName}:`, error);
    return;
  }

  for (const file of files) {
    try {
      const { data: blob } = await oldClient.storage
        .from(bucketName)
        .download(file.name);
      
      await newClient.storage
        .from(bucketName)
        .upload(file.name, blob, { upsert: true });
      
      console.log(`✓ Migrated: ${file.name}`);
    } catch (err) {
      console.error(`✗ Failed to migrate ${file.name}:`, err.message);
    }
  }
}

async function migrate() {
  const buckets = ['property-media', 'property-pdfs', 'company-assets'];
  
  for (const bucket of buckets) {
    await migrateBucket(bucket);
  }
  
  console.log('\n✅ Storage migration complete!');
}

migrate();
```

Run it with: `node migrate-storage.js`

### Step 5: Verify Migration

1. **Test Login**: Try logging in with an existing user account
2. **Check Data**: Verify listings, leads, and other records are visible
3. **Test Images**: Ensure property images load correctly
4. **Test Functions**: If you have Edge Functions, redeploy them

### Step 6: Update Production (if applicable)

If you have a deployed version:
1. Update environment variables in Vercel/Netlify/etc.
2. Redeploy the application

## 🚨 IMPORTANT NOTES

- **Keep old project active** for 48 hours as a backup
- **Service Role Key**: You'll need this from the new project's Settings → API for storage migration
- **Test thoroughly** before decommissioning the old project

## 📋 Checklist

- [ ] All migrations executed in new project
- [ ] Data migrated (public schema)
- [ ] Auth users migrated
- [ ] Storage files migrated
- [ ] Application tested and working
- [ ] Production environment updated (if applicable)
- [ ] Old project backed up and ready to archive
