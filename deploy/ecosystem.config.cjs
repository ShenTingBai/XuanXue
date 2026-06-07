// PM2 生产环境配置 — XuanXue (玄·道)
// 部署后执行: pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
// 备份策略: 每 6 小时自动备份 SQLite 数据库，保留 30 天（见 deploy/backup.sh）
module.exports = {
  apps: [
    {
      name: 'xuanxue',
      // Nuxt 3 构建产物在 .output/server/index.mjs
      script: '.output/server/index.mjs',
      // 以专用用户运行（部署前先创建 xuanxue 用户）
      user: 'xuanxue',
      // 从 .env 文件加载敏感配置（SESSION_SECRET 等），不硬编码在版本控制中
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        NITRO_PORT: '3000',
        NITRO_HOST: '127.0.0.1',
      },
      // 自动重启
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      // 内存超过 300MB 自动重启（防泄漏）
      max_memory_restart: '300M',
      // 日志
      error_file: '/www/server/xuanxue/logs/pm2-error.log',
      out_file: '/www/server/xuanxue/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 优雅关闭：给 5 秒处理已有请求
      kill_timeout: 5000,
      listen_timeout: 3000,
    },
  ],
}
