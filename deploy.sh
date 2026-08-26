#!/bin/bash

# ==============================================================================
# اسکریپت بروزرسانی و استقرار خودکار سامانه شهرک صنعتی در سرور لینوکس (VPS)
# ==============================================================================

set -e

echo "🚀 [1/5] دریافت آخرین تغییرات از گیت‌هاب (Git Pull)..."
git pull origin main || git pull origin master

echo "📦 [2/5] نصب وابستگی‌های برنامه (npm install)..."
npm install --production=false

echo "🗄️ [3/5] اعمال تغییرات پایگاه داده (Drizzle DB Push)..."
npx drizzle-kit push || true

echo "🔨 [4/5] کامپایل و ساخت نسخه نهایی (Production Build)..."
npm run build

echo "🔄 [5/5] راه‌اندازی مجدد سرویس با PM2..."
if command -v pm2 &> /dev/null
then
    pm2 reload industrial-park || pm2 start ecosystem.config.cjs
    pm2 save
    echo "✅ برنامه با موفقیت بروزرسانی و راه‌اندازی شد!"
else
    echo "⚠️ ابزار PM2 نصب نیست. لطفا با دستور 'npm start' یا اجرای docker-compose برنامه را اجرا نمایید."
fi
