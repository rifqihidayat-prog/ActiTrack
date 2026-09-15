module.exports = {
  apps: [
    {
      name: "actitrack",
      cwd: "/home/admin/apps/actitrack",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3014",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: "3014",
        DATABASE_URL: "file:./src/db/actitrack.db",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
};
