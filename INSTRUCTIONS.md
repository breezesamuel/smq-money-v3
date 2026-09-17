# Render部署说明

## 首次部署（手动）

1. 打开360浏览器，访问: https://dashboard.render.com
2. 登录 Render账号
3. 点击 "New Web Service"
4. 选择 GitHub 仓库: `breezesamuel/smq-money`
5. 设置:
   - Name: smq-money
   - Branch: main
   - Build Command: npm install
   - Start Command: node server.js
6. 添加环境变量:
   - PORT = 10000
   - RATE_USD_TO_CNY = 7.5
7. 点击 "Create Web Service"

## 后续部署（自动）

每次推送代码后会自动部署:
```bash
git add .
git commit -m "update"
git push origin main
```

## 验证

部署完成后访问: https://smq-money.onrender.com