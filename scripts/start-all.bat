@echo off
echo 🚀 Starting Decentralized Health Visit System...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ and try again.
    pause
    exit /b 1
)

REM Install concurrently if not already installed
echo 📦 Installing concurrently globally...
npm install -g concurrently

REM Start all services
echo 🔄 Starting all services...
echo 🖥️  Starting Backend API on port 3001...
echo 📊 Starting Admin Dashboard on port 3000...
echo 📱 Starting Feedback System on port 3002...

concurrently ^
  --prefix-colors "blue,green,yellow" ^
  --prefix "[{name}]" ^
  --names "BACKEND,DASHBOARD,FEEDBACK" ^
  "cd backend && npm start" ^
  "cd dashboard && npm start" ^
  "cd feedback && npm start"

echo ✅ All services are running!
echo.
echo 🌐 Access points:
echo    - Admin Dashboard: http://localhost:3000
echo    - Backend API: http://localhost:3001
echo    - Feedback System: http://localhost:3002
echo.
echo 📱 To start the mobile app:
echo    cd mobile-app && npm start
echo.
echo 🛑 To stop all services, press Ctrl+C
pause