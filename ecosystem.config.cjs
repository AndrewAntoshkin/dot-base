const fs = require('fs');
const path = require('path');

// Parse .env.local manually (no dotenv dependency needed)
function parseEnvFile(filePath) {
  const env = {};
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.replace(/\r$/, '').trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  } catch (err) {
    console.error('Failed to read', filePath, err.message);
  }
  return env;
}

const envLocal = parseEnvFile(path.join(__dirname, '.env.local'));

// Shared config for both blue/green slots
const sharedConfig = {
  script: 'node_modules/.bin/next',
  args: 'start',
  cwd: __dirname,
  interpreter: '/opt/fnode/bin/node',
  autorestart: true,
  max_memory_restart: '3500M',
  kill_timeout: 5000,
  merge_logs: true,
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
};

module.exports = {
  apps: [
    {
      ...sharedConfig,
      name: 'basecraft-blue',
      env: {
        ...envLocal,
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=3584',
        PORT: 3000,
      },
      error_file: 'logs/pm2-blue-error.log',
      out_file: 'logs/pm2-blue-out.log',
    },
    {
      ...sharedConfig,
      name: 'basecraft-green',
      env: {
        ...envLocal,
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=3584',
        PORT: 3001,
      },
      error_file: 'logs/pm2-green-error.log',
      out_file: 'logs/pm2-green-out.log',
    },
  ],
};