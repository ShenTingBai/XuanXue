#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# XuanXue 服务器初始化脚本
# 全新阿里云 ECS + 宝塔面板 部署前执行一次
# ⚠️  请逐行审查后再执行，不要盲目复制粘贴
# ═══════════════════════════════════════════════════════════════
set -e

echo "=== 1. 创建专用系统用户 ==="
useradd -m -s /bin/false xuanxue 2>/dev/null || echo "用户已存在，跳过"

echo "=== 2. 创建目录结构 ==="
mkdir -p /www/server/xuanxue/data
mkdir -p /www/server/xuanxue/logs
mkdir -p /www/server/xuanxue/backups

echo "=== 3. 生成 SESSION_SECRET 并写入 .env ==="
SESSION_SECRET=$(openssl rand -hex 32)
ENV_FILE="/www/wwwroot/xuanxue/.env"
if [ ! -f "$ENV_FILE" ]; then
    cp /www/wwwroot/xuanxue/deploy/.env.example "$ENV_FILE"
    sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    chown xuanxue:xuanxue "$ENV_FILE"
    echo "SESSION_SECRET 已写入 $ENV_FILE"
else
    echo ".env 已存在，跳过生成。如需重新生成，请手动编辑 $ENV_FILE"
fi

echo "=== 4. 设置文件权限 ==="
# 数据库目录：仅 xuanxue 用户可读写
chown -R xuanxue:xuanxue /www/server/xuanxue/
chmod 700 /www/server/xuanxue/data/
chmod 600 /www/server/xuanxue/data/*.db 2>/dev/null || true

echo "=== 5. 配置防火墙（仅开放必要端口） ==="
# 22 = SSH, 80 = HTTP, 443 = HTTPS
# ⚠️  宝塔面板端口不在此开放 — 去阿里云安全组单独配置
sudo ufw default deny incoming 2>/dev/null || true
sudo ufw default allow outgoing 2>/dev/null || true
sudo ufw allow 22/tcp 2>/dev/null || true
sudo ufw allow 80/tcp 2>/dev/null || true
sudo ufw allow 443/tcp 2>/dev/null || true
echo "防火墙规则已设置（如果 UFW 不可用，请用阿里云安全组配置）"

echo "=== 6. 安装 Node.js（如未安装） ==="
if ! command -v node &>/dev/null; then
    echo "Node.js 未安装，请通过宝塔面板安装 Node.js 20.x LTS"
else
    echo "Node.js $(node -v) 已安装"
fi

echo ""
echo "════════════════════════════════════════════════"
echo " 服务器初始化完成。接下来手动操作："
echo ""
echo " 1. 宝塔面板：改端口（8888→自定义）+ 开二次验证"
echo " 2. 阿里云安全组：仅开放 22/80/443"
echo " 3. 阿里云安全组：宝塔端口仅对你家 IP 开放"
echo " 4. SESSION_SECRET 已自动写入 /www/wwwroot/xuanxue/.env（如未自动生成请手动检查）"
echo " 5. npm run build（本地构建）"
echo " 6. 上传 .output/ + ecosystem.config.cjs + deploy/ 到 /www/wwwroot/xuanxue/"
echo " 7. cd /www/wwwroot/xuanxue && npm install --production"
echo " 8. pm2 start ecosystem.config.cjs && pm2 save && pm2 startup"
echo " 9. 配置备份 cron（参见 deploy/backup.sh 头部说明）"
echo "════════════════════════════════════════════════"
