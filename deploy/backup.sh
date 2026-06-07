#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# XuanXue SQLite 自动备份脚本
#
# 使用 sqlite3 .backup 命令做一致性备份（不锁文件，安全用于运行中数据库）
# 保留最近 30 天备份，自动清理过期文件
#
# cron 配置（每 6 小时执行一次）:
#   crontab -e -u xuanxue
#   0 */6 * * * /www/wwwroot/xuanxue/deploy/backup.sh >> /www/server/xuanxue/logs/backup.log 2>&1
#
# 手动执行:
#   bash /www/wwwroot/xuanxue/deploy/backup.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

# --- 配置 ---
BACKUP_DIR="/www/server/xuanxue/backups"
DB_FILE="${DB_PATH:-/www/server/xuanxue/data/xuanxue.db}"
RETENTION_DAYS=30

# --- 检查 ---
if [ ! -f "$DB_FILE" ]; then
    echo "[$(date '+%F %T')] ERROR: 数据库文件不存在: $DB_FILE"
    exit 1
fi

mkdir -p "$BACKUP_DIR"

# --- 备份 ---
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/xuanxue_${TIMESTAMP}.db"

# 使用 sqlite3 .backup 做一致性备份（即使数据库正在被写入也安全）
sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date '+%F %T')] 备份完成: $BACKUP_FILE ($BACKUP_SIZE)"

# --- 清理过期备份 ---
DELETED=$(find "$BACKUP_DIR" -name "xuanxue_*.db" -type f -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "[$(date '+%F %T')] 已清理 $DELETED 个超过 ${RETENTION_DAYS} 天的备份"
fi

echo "[$(date '+%F %T')] 当前备份数量: $(ls -1 "$BACKUP_DIR"/xuanxue_*.db 2>/dev/null | wc -l)"
