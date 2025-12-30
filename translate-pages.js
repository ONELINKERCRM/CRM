#!/usr/bin/env node

/**
 * Automatic Translation Script
 * 
 * This script automatically adds translation wrappers to common English text patterns
 * in React/TypeScript files.
 * 
 * Usage: node translate-pages.js <file-path>
 * Example: node translate-pages.js src/pages/LeadsPage.tsx
 */

const fs = require('fs');
const path = require('path');

// Translation mappings - English text to translation key
const translations = {
    // Common actions
    'Save': 'save',
    'Save Changes': 'save_changes',
    'Cancel': 'cancel',
    'Delete': 'delete',
    'Edit': 'edit',
    'Add': 'add',
    'Create': 'create',
    'Update': 'update',
    'Remove': 'remove',
    'View': 'view',
    'Close': 'close',
    'Confirm': 'confirm',
    'Back': 'back',
    'Next': 'next',
    'Submit': 'submit',
    'Search': 'search',
    'Filter': 'filter',
    'Export': 'export',
    'Import': 'import',
    'Download': 'download',
    'Upload': 'upload',
    'Refresh': 'refresh',

    // Navigation
    'Dashboard': 'dashboard',
    'Leads': 'leads',
    'Listings': 'listings',
    'My Listings': 'my_listings',
    'Settings': 'settings',
    'Teams': 'teams',
    'Campaigns': 'campaigns',
    'Pipeline': 'pipeline',
    'Notifications': 'notifications',

    // Status
    'Active': 'active',
    'Pending': 'pending',
    'Completed': 'completed',
    'New': 'new',
    'Closed': 'closed',
    'Lost': 'lost',

    // Messages
    'Loading...': 'loading',
    'No data available': 'no_data',
    'No results found': 'no_results',
    'Success': 'success',
    'Error': 'error',

    // Common labels
    'Name': 'name',
    'Email': 'email',
    'Phone': 'phone',
    'Status': 'status',
    'Actions': 'actions',
    'Created': 'created',
    'Updated': 'updated',
    'Description': 'description',
};

function translateFile(filePath) {
    console.log(`\n🔄 Processing: ${filePath}`);

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if useLocalization is already imported
    const hasLocalizationImport = content.includes('useLocalization');

    // Step 1: Add import if not present
    if (!hasLocalizationImport) {
        console.log('  ✅ Adding useLocalization import...');

        // Find the last import statement
        const importRegex = /import .+ from .+;/g;
        const imports = content.match(importRegex);

        if (imports && imports.length > 0) {
            const lastImport = imports[imports.length - 1];
            const importToAdd = `import { useLocalization } from "@/contexts/LocalizationContext";`;

            content = content.replace(lastImport, `${lastImport}\n${importToAdd}`);
            modified = true;
        }
    }

    // Step 2: Add hook if not present
    if (!content.includes('const { t }') && !content.includes('const {t}')) {
        console.log('  ✅ Adding t() hook...');

        // Find the component function
        const componentRegex = /(const|function)\s+\w+\s*=?\s*\([^)]*\)\s*(?::\s*\w+\s*)?=>\s*{/;
        const match = content.match(componentRegex);

        if (match) {
            const hookToAdd = `\n  const { t } = useLocalization();\n`;
            content = content.replace(match[0], match[0] + hookToAdd);
            modified = true;
        }
    }

    // Step 3: Replace common text patterns
    let replacementCount = 0;

    Object.entries(translations).forEach(([english, key]) => {
        // Pattern 1: JSX text content <tag>Text</tag>
        const pattern1 = new RegExp(`>\\s*${english}\\s*<`, 'g');
        const replacement1 = `>{t('${key}')}<`;

        if (pattern1.test(content)) {
            content = content.replace(pattern1, replacement1);
            replacementCount++;
        }

        // Pattern 2: String literals "Text" or 'Text' (but not in imports)
        const pattern2 = new RegExp(`(['"])${english}\\1(?!.*from)`, 'g');
        const replacement2 = `{t('${key}')}`;

        // Only replace in JSX context (between > and <)
        const jsxPattern = new RegExp(`>([^<]*['"])${english}\\1([^<]*)<`, 'g');
        if (jsxPattern.test(content)) {
            content = content.replace(jsxPattern, (match) => {
                return match.replace(new RegExp(`(['"])${english}\\1`, 'g'), `{t('${key}')}`);
            });
            replacementCount++;
        }
    });

    if (replacementCount > 0) {
        console.log(`  ✅ Replaced ${replacementCount} text patterns`);
        modified = true;
    }

    // Step 4: Save file if modified
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ File updated successfully!`);
        return true;
    } else {
        console.log(`  ℹ️  No changes needed`);
        return false;
    }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log(`
📖 Usage: node translate-pages.js <file-path>

Example:
  node translate-pages.js src/pages/LeadsPage.tsx
  node translate-pages.js src/pages/DashboardPage.tsx

This script will:
1. Add useLocalization import
2. Add const { t } = useLocalization()
3. Replace common English text with t('key')
  `);
    process.exit(0);
}

const filePath = args[0];

if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found: ${filePath}`);
    process.exit(1);
}

try {
    const success = translateFile(filePath);

    if (success) {
        console.log(`\n✅ Translation complete! File has been updated.`);
        console.log(`\n📝 Next steps:`);
        console.log(`   1. Review the changes`);
        console.log(`   2. Test the page in Arabic mode`);
        console.log(`   3. Fix any remaining hardcoded text manually`);
    }
} catch (error) {
    console.error(`\n❌ Error processing file:`, error.message);
    process.exit(1);
}
