@echo off
rem Okara 每日推广自动化 - Windows 计划任务入口
cd /d C:\Users\Think\project\smq-v3
node promo\run-daily.js --arcade 3 --tools 3 >> promo\promo-daily.log 2>&1