module.exports = {
  "apps": [
    {
      "name": "kpi-backend",
      "script": "server.js",
      "instances": 1,
      "exec_mode": "fork",
      "env": {
        "NODE_ENV": "production",
        "PORT": 5001
      },
      "env_development": {
        "NODE_ENV": "development",
        "PORT": 5001
      },
      "max_memory_restart": "1G",
      "node_args": "--expose-gc --max-old-space-size=1024",
      "error_file": "./logs/pm2-error.log",
      "out_file": "./logs/pm2-out.log",
      "log_file": "./logs/pm2-combined.log",
      "time": true,
      "restart_delay": 4000,
      "max_restarts": 10,
      "min_uptime": "10s",
      "watch": false,
      "ignore_watch": [
        "node_modules",
        "logs"
      ],
      "kill_timeout": 5000,
      "wait_ready": true,
      "listen_timeout": 10000
    }
  ]
};