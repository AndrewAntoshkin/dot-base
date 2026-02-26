// Next.js reads .env.local automatically — no need to parse it here.
// Only set variables that PM2/Node need or that override Next.js defaults.

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
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=3584',
        PORT: 3001,
      },
      error_file: 'logs/pm2-green-error.log',
      out_file: 'logs/pm2-green-out.log',
    },
    {
      name: 'gen-worker',
      script: 'worker.ts',
      cwd: __dirname,
      interpreter: '/opt/fnode/bin/node',
      interpreter_args: '--import tsx',
      instances: 5,
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '512M',
      kill_timeout: 5000,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/pm2-worker-error.log',
      out_file: 'logs/pm2-worker-out.log',
    },
  ],
};