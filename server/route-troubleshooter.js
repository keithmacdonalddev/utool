// route-troubleshooter.js - A script to identify and fix problematic route definitions
// This script is designed to find and log any route patterns that might be causing
// path-to-regexp errors in Express applications

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to scan for route files
const routesDir = path.join(__dirname, 'routes');

console.log('🔍 Scanning route files for potential path-to-regexp issues...');

// Read all files in the routes directory
const routeFiles = fs
  .readdirSync(routesDir)
  .filter((file) => file.endsWith('.js'));

// Common patterns that can cause path-to-regexp errors
const problematicPatterns = [
  {
    pattern: /https?:\/\//g,
    description: 'Full URL in route definition (should be a relative path)',
  },
  {
    pattern: /\/:([^\/]*)(\/|$)/g,
    description: 'Route parameter without proper name',
  },
  {
    pattern: /\(.*\)/g,
    description: 'Parentheses in route path (might need escaping)',
  },
  {
    pattern: /\[\]/g,
    description: 'Empty brackets in route path',
  },
];

// Process each route file
let fileCount = 0;
let issueCount = 0;

for (const file of routeFiles) {
  const filePath = path.join(routesDir, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    fileCount++;

    // Look for route definitions like router.get(), router.post(), etc.
    const routeRegex =
      /router\.(get|post|put|delete|patch|all|use)\(['"]([^'"]+)['"]/g;
    let match;

    while ((match = routeRegex.exec(content)) !== null) {
      const routePath = match[2];

      // Check if this route path contains any problematic patterns
      for (const { pattern, description } of problematicPatterns) {
        if (pattern.test(routePath)) {
          issueCount++;
          console.log(`⚠️  Potential issue in ${file}:`);
          console.log(`   Route: ${routePath}`);
          console.log(`   Issue: ${description}`);
          console.log(
            `   Line: ${content.substring(0, match.index).split('\n').length}`
          );
          console.log('');

          // Reset regex pattern so we can test again on next route
          pattern.lastIndex = 0;
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}: ${error.message}`);
  }
}

console.log(
  `📊 Scan complete: ${fileCount} files scanned, ${issueCount} potential issues found.`
);

// Check for misuse of URLs in other key files
console.log('🔍 Checking server.js for issues...');
try {
  const serverContent = fs.readFileSync(
    path.join(__dirname, 'server.js'),
    'utf8'
  );

  // Look for app.use() with a URL pattern instead of a path
  const appUseRegex = /app\.use\(['"]([^'"]+)['"], /g;
  let match;

  while ((match = appUseRegex.exec(serverContent)) !== null) {
    const mountPath = match[1];

    // Check if the mount path is a URL
    if (mountPath.startsWith('http')) {
      console.log(`⚠️  Potential issue in server.js:`);
      console.log(`   Mount path: ${mountPath}`);
      console.log(
        `   Issue: Full URL used as mount path (should be a relative path)`
      );
      console.log(
        `   Line: ${serverContent.substring(0, match.index).split('\n').length}`
      );
      console.log('');
    }
  }
} catch (error) {
  console.error(`❌ Error checking server.js: ${error.message}`);
}

console.log(
  '\n📝 Suggestion: Based on your error message, check for any route definitions that contain "https://git.new" or have malformed path parameters.'
);
console.log(
  '\n🔧 If nothing is found here, check for Express middleware that might be creating routes or redirects with full URLs instead of paths.'
);
