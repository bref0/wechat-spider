# Mac 定时任务设置指南

在 Mac 上有两种方式设置定时任务:
1. **crontab** - 类 Unix 系统通用,和 Linux 一致
2. **launchd** - macOS 原生,功能更强大

---

## 方法一: 使用 crontab (推荐)

### 1. 授予 cron 完全磁盘访问权限

**macOS Catalina (10.15) 及以上版本需要此步骤**:

1. 打开 `系统偏好设置` > `安全性与隐私` > `隐私`
2. 左侧选择 `完全磁盘访问权限`
3. 点击左下角锁图标解锁
4. 点击 `+` 添加 `/usr/sbin/cron`
   - 按 `Cmd + Shift + G` 输入 `/usr/sbin`
   - 找到 `cron` 并添加

### 2. 编辑 crontab

```bash
# 打开 crontab 编辑器
crontab -e
```

第一次运行会让你选择编辑器,推荐选择 `vim` 或 `nano`。

### 3. 添加定时任务

在打开的编辑器中添加以下内容:

```bash
# 每天凌晨2点执行
0 2 * * * /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/scripts/cron-batch.sh >> /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/logs/cron.log 2>&1

# 每6小时执行一次 (00:00, 06:00, 12:00, 18:00)
0 */6 * * * /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/scripts/cron-batch.sh >> /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/logs/cron.log 2>&1

# 每12小时执行一次 (00:00, 12:00)
0 */12 * * * /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/scripts/cron-batch.sh >> /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/logs/cron.log 2>&1

# 工作日每天早上9点
0 9 * * 1-5 /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/scripts/cron-batch.sh >> /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/logs/cron.log 2>&1

# 测试用: 每分钟执行一次 (测试完记得删除!)
* * * * * /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/scripts/cron-batch.sh >> /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/logs/cron.log 2>&1
```

**Cron 表达式格式**:
```
* * * * * 命令
│ │ │ │ │
│ │ │ │ └─ 星期 (0-7, 0和7都是周日)
│ │ │ └─── 月份 (1-12)
│ │ └───── 日期 (1-31)
│ └─────── 小时 (0-23)
└───────── 分钟 (0-59)
```

### 4. 保存并退出

- **vim**: 按 `ESC`,输入 `:wq`,回车
- **nano**: 按 `Ctrl + X`,输入 `Y`,回车

### 5. 验证任务已添加

```bash
# 查看当前所有 cron 任务
crontab -l
```

### 6. 查看执行日志

```bash
# 实时查看日志
tail -f /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/logs/cron.log

# 查看最近100行
tail -n 100 /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/logs/cron.log
```

### 7. 删除或修改任务

```bash
# 再次编辑
crontab -e

# 删除所有任务
crontab -r
```

---

## 方法二: 使用 launchd (macOS 原生)

launchd 是 macOS 推荐的方式,功能更强大,支持:
- 系统启动时运行
- 文件变化触发
- 更精细的时间控制
- 电源管理感知(笔记本电池模式可以暂停任务)

### 1. 创建 plist 配置文件

创建文件 `~/Library/LaunchAgents/com.wechat.spider.plist`:

```bash
# 创建文件
nano ~/Library/LaunchAgents/com.wechat.spider.plist
```

### 2. 添加配置内容

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- 任务标识符 (必须唯一) -->
    <key>Label</key>
    <string>com.wechat.spider</string>

    <!-- 执行的程序 -->
    <key>ProgramArguments</key>
    <array>
        <string>/Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/scripts/cron-batch.sh</string>
    </array>

    <!-- 工作目录 -->
    <key>WorkingDirectory</key>
    <string>/Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node</string>

    <!-- 标准输出日志 -->
    <key>StandardOutPath</key>
    <string>/Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/logs/launchd.log</string>

    <!-- 标准错误日志 -->
    <key>StandardErrorPath</key>
    <string>/Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/logs/launchd-error.log</string>

    <!-- 定时执行配置 - 每天凌晨2点 -->
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <!-- 加载后不立即运行 -->
    <key>RunAtLoad</key>
    <false/>

    <!-- 任务结束后不自动重启 -->
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>
```

**多个时间点配置** (例如每6小时):

```xml
<!-- 每天 00:00, 06:00, 12:00, 18:00 执行 -->
<key>StartCalendarInterval</key>
<array>
    <dict>
        <key>Hour</key>
        <integer>0</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <dict>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <dict>
        <key>Hour</key>
        <integer>12</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <dict>
        <key>Hour</key>
        <integer>18</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
</array>
```

### 3. 设置文件权限

```bash
chmod 644 ~/Library/LaunchAgents/com.wechat.spider.plist
```

### 4. 加载任务

```bash
# 加载任务
launchctl load ~/Library/LaunchAgents/com.wechat.spider.plist

# 如果修改了 plist,先卸载再重新加载
launchctl unload ~/Library/LaunchAgents/com.wechat.spider.plist
launchctl load ~/Library/LaunchAgents/com.wechat.spider.plist
```

### 5. 验证任务状态

```bash
# 查看任务列表
launchctl list | grep wechat

# 查看任务详情
launchctl list com.wechat.spider
```

### 6. 手动触发任务(测试用)

```bash
# 立即执行一次
launchctl start com.wechat.spider
```

### 7. 停止和删除任务

```bash
# 停止任务
launchctl stop com.wechat.spider

# 卸载任务
launchctl unload ~/Library/LaunchAgents/com.wechat.spider.plist

# 删除配置文件
rm ~/Library/LaunchAgents/com.wechat.spider.plist
```

### 8. 查看日志

```bash
# 查看输出日志
tail -f /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/logs/launchd.log

# 查看错误日志
tail -f /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/logs/launchd-error.log

# 查看系统日志
log stream --predicate 'subsystem == "com.apple.xpc.launchd"' | grep wechat
```

---

## 快速测试步骤

### 测试1: 立即运行脚本

```bash
cd /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node
./scripts/cron-batch.sh
```

### 测试2: 每分钟执行一次 (crontab)

```bash
# 1. 编辑 crontab
crontab -e

# 2. 添加测试任务
* * * * * /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/scripts/cron-batch.sh >> /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/logs/cron.log 2>&1

# 3. 保存退出,等待1分钟

# 4. 查看日志确认执行
tail -f /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/logs/cron.log

# 5. 测试完成后删除
crontab -e  # 删除刚才添加的那行
```

### 测试3: launchd 立即执行

```bash
# 1. 创建并加载 plist (见上方步骤)

# 2. 手动触发
launchctl start com.wechat.spider

# 3. 查看日志
tail -f /Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/logs/launchd.log
```

---

## 两种方法对比

| 特性 | crontab | launchd |
|------|---------|---------|
| **兼容性** | 跨平台 (Linux/Mac/Unix) | 仅 macOS |
| **配置难度** | 简单 | 中等 |
| **功能** | 基础定时 | 高级 (电源管理、文件监控等) |
| **权限管理** | 需要授权 | 需要授权 |
| **推荐场景** | 简单定时任务 | 复杂任务、需要开机启动 |
| **我的推荐** | ✅ 推荐 (和服务器一致) | 如需高级功能可选 |

---

## 常见问题

### Q1: cron 没有执行怎么办?

**检查步骤**:
1. 确认已授予完全磁盘访问权限
2. 检查脚本有执行权限: `ls -l scripts/cron-batch.sh`
3. 使用绝对路径,不要使用 `~` 或相对路径
4. 查看系统日志: `log show --predicate 'process == "cron"' --last 1h`

### Q2: 如何接收任务执行通知?

**方法1**: 发送邮件 (需要配置 sendmail)

修改 `cron-batch.sh`:

```bash
if [ $EXIT_CODE -ne 0 ]; then
  echo "爬取失败!" | mail -s "微信爬虫错误" your@email.com
fi
```

**方法2**: 使用 macOS 通知

```bash
# 安装 terminal-notifier
brew install terminal-notifier

# 在脚本末尾添加
terminal-notifier -title "微信爬虫" -message "爬取完成" -sound default
```

### Q3: Mac 休眠时任务会执行吗?

- **crontab**: ❌ 休眠时不会执行,唤醒后不会补执行
- **launchd**: ✅ 可配置唤醒后补执行(设置 `StartCalendarInterval`)

如需确保执行,保持 Mac 不休眠或使用 launchd。

### Q4: 如何设置开机启动?

使用 **launchd** 并设置:

```xml
<key>RunAtLoad</key>
<true/>
```

---

## 推荐配置

**如果你主要在 Mac 本地测试,未来部署到 Linux**:

✅ **使用 crontab**
- 配置简单
- 和服务器环境一致
- 便于迁移

**如果你长期在 Mac 上运行**:

✅ **使用 launchd**
- macOS 原生支持
- 更稳定可靠
- 支持电源管理

---

## 下一步

1. **选择方法**: crontab (推荐) 或 launchd
2. **测试运行**: 先设置每分钟执行,确认正常后修改为实际时间
3. **监控日志**: 定期检查日志确保正常运行
4. **备份数据**: 定期备份 `data/wechat.db` 和 `output/`
