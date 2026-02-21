module.exports = {
  apps: [
    {
      name: 'riders-api',
      script: 'server.js',
      cwd: '/var/www/riders-backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '.env.production',
      error_file: '/var/log/riders-api/error.log',
      out_file: '/var/log/riders-api/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
