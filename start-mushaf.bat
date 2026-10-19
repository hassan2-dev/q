@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   مصحف البيت
echo   ثبت Expo Go على الجوال، ثم امسح رمز QR من نفس شبكة الواي فاي
echo.
npx expo start
pause
