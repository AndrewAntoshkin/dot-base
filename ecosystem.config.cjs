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

module.exports = {
  apps: [{
    name: 'basecraft',
    script: '/opt/fnode/bin/npm',
    args: 'start',
    cwd: __dirname,
    interpreter: '/opt/fnode/bin/node',
    node_args: '--max-old-space-size=4096',
    env: {
      ...envLocal,
      NODE_ENV: 'production',
    },
    // Auto-restart on crash
    autorestart: true,
    max_memory_restart: '4G',
    // Logs
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};