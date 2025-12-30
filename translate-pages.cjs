#!/usr/bin/env node

/**
 * Automatic Translation Script
 * 
 * This script automatically adds translation wrappers to common English text patterns
 * in React/TypeScript files.
 * 
 * Usage: node translate-pages.cjs <file-path>
 * Example: node translate-pages.cjs src/pages/LeadsPage.tsx
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
    // Check for hook usage in function body
    if (!content.includes('const { t }') && !content.includes('const {t}')) {
        console.log('  ✅ Adding t() hook...');

        // Find the component function
        // Regex covers: const Comp = () => { or function Comp() {
        const componentRegex = /(const|function)\s+\w+\s*=?\s*\([^)]*\)\s*(?::\s*\w+\s*)?=>\s*{|function\s+\w+\s*\([^)]*\)\s*{/;
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
        // Escape English text for Regex if needed (e.g. if it contains regex chars)
        // Simple approach for now
        const pattern1 = new RegExp(`>\\s*${english}\\s*<`, 'g');
        const replacement1 = `>{t('${key}')}<`;

        if (pattern1.test(content)) {
            content = content.replace(pattern1, replacement1);
            replacementCount++;
        }

        // Pattern 2: String literals "Text" or 'Text' inside prop values or similar
        // We strictly look for >"Text"< style or prop="Text" which is hard with regex
        // Let's stick to the safer visual replacements for now like `placeholder="Name"` -> `placeholder={t('name')}`
        // But the previous script logic had:
        // const jsxPattern = new RegExp(`>([^<]*['"])${english}\\1([^<]*)<`, 'g');
        // and
        // const pattern2 = new RegExp(`(['"])${english}\\1(?!.*from)`, 'g');

        // Let's refine Pattern 2 to be safe: property assignment
        // e.g. placeholder="Name" -> placeholder={t('name')}
        // e.g. label="Name" -> label={t('name')}
        const propsPattern = new RegExp(`(\\w+)=(['"])${english}\\2`, 'g');
        if (propsPattern.test(content)) {
            content = content.replace(propsPattern, `$1={t('${key}')}`);
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
📖 Usage: node translate-pages.cjs <file-path>
`);
    process.exit(0);
}

const filePath = args[0];

if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found: ${filePath}`);
    process.exit(1);
}

try {
    translateFile(filePath);
} catch (error) {
    console.error(`\n❌ Error processing file:`, error.message);
    process.exit(1);
}
