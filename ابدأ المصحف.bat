@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Mushaf al-Bayt
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo Node.js is not installed.
  echo Install it from https://nodejs.org then open this file again.
  echo.
  pause
  exit /b 1
)
node server.js
if errorlevel 1 pause
