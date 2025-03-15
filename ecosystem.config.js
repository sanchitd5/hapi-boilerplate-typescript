module.exports = {
  apps: [{
    name: 'hapi-base-setup',
    script: 'src/entry.ts',
    interpreter: 'node',
    interpreter_args: '--expose-gc --max-old-space-size=8192 -r ts-node/register',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '7G',
    kill_timeout: 3000,
    wait_ready: true,
    listen_timeout: 10000,
    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    error_file: 'logs/pm2_error.log',
    out_file: 'logs/pm2_out.log',
    time: true
  }]
}