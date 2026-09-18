// monitor/run-monitor.bat - Windows 计划任务入口（每 15 分钟调用）
@echo off
cd /d C:\Users\Think\project\smq-v3
node monitor\run-monitor.js --notify >> monitor\alerts\monitor-run.log 2>&1