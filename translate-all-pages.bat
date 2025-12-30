@echo off
REM Batch Translation Script for Windows
REM This script translates all major pages in the CRM

echo ========================================
echo   CRM Arabic Translation Batch Script
echo ========================================
echo.

echo Starting translation process...
echo.

REM High Priority Pages
echo [1/10] Translating Settings Page...
node translate-pages.js src\pages\SettingsPage.tsx

echo [2/10] Translating Leads Page...
node translate-pages.js src\pages\LeadsPage.tsx

echo [3/10] Translating Dashboard Page...
node translate-pages.js src\pages\DashboardPage.tsx 2>nul || echo   (Dashboard page not found, skipping...)

echo [4/10] Translating Listings Page...
node translate-pages.js src\pages\ListingsPage.tsx

echo [5/10] Translating Lead Assignment Page...
node translate-pages.js src\pages\LeadAssignmentPage.tsx

REM Medium Priority Pages
echo [6/10] Translating Teams Page...
node translate-pages.js src\pages\TeamsPage.tsx

echo [7/10] Translating Campaigns Page...
node translate-pages.js src\pages\CampaignsPage.tsx

echo [8/10] Translating Pipeline Page...
node translate-pages.js src\pages\PipelinePage.tsx

echo [9/10] Translating Lead Detail Page...
node translate-pages.js src\pages\LeadDetailPage.tsx

echo [10/10] Translating Integrations Page...
node translate-pages.js src\pages\IntegrationsPage.tsx

echo.
echo ========================================
echo   Translation Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Review the changes in each file
echo   2. Test pages in Arabic mode
echo   3. Fix any remaining hardcoded text
echo.
echo Press any key to exit...
pause >nul
