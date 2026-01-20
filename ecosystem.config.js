module.exports = {
  apps: [{
    name: 'unsic-dashboard',
      user: 'sviluppatore',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/projects/unsic',
    env: {
      NODE_ENV: 'production',
      PORT: 3025
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '500M',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    time: true
  }]
};
