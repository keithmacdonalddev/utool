/**
 * This script allows you to choose which backend server to use when running the React client.
 * It sets the appropriate environment variables before starting the React development server.
 *
 * Usage:
 *   node scripts/start-with-server.js [local|prod]
 *
 * Example:
 *   node scripts/start-with-server.js local  -> Uses local development server
 *   node scripts/start-with-server.js prod   -> Uses production Render server
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration for different server environments
const envConfig = {
  local: {
    REACT_APP_API_URL: 'http://localhost:5000/api/v1',
    REACT_APP_SOCKET_URL: 'http://localhost:5000',
  },
  prod: {
    REACT_APP_API_URL: 'https://utool.onrender.com/api/v1',
    REACT_APP_SOCKET_URL: 'https://utool.onrender.com',
  },
};

// Get server choice from command line argument
const serverChoice = process.argv[2]?.toLowerCase() || 'local';

if (!['local', 'prod'].includes(serverChoice)) {
  console.error(
    '\x1b[31mError: Invalid server choice. Use "local" or "prod".\x1b[0m'
  );
  process.exit(1);
}

const selectedEnv = envConfig[serverChoice];

// Create or update .env.development file with the appropriate values
const envFilePath = path.join(__dirname, '..', '.env.development');
const envContent = Object.entries(selectedEnv)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

fs.writeFileSync(envFilePath, envContent);

console.log(
  '\x1b[32m%s\x1b[0m',
  `Using ${serverChoice === 'local' ? 'LOCAL' : 'PRODUCTION'} backend server`
);
console.log('\x1b[36m%s\x1b[0m', `API URL: ${selectedEnv.REACT_APP_API_URL}`);
console.log('\n');

// Start React development server with the environment variables
const reactStart = spawn('npm', ['start'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ...selectedEnv },
});

reactStart.on('close', (code) => {
  console.log(`React development server exited with code ${code}`);
});
