@echo off
REM 每日上新管线：生成新工具+构建推广campaign+重建SEO+部署
cd /d "C:\Users\Think\project\smq-v3"
node scripts\daily-release.js --n 8 --deploy 1 >> daily-release.log 2>&1