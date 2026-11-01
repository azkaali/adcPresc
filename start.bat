@echo off
title Diagnosis ^& Prescription System
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Download the LTS version from https://nodejs.org, install it, then run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run: installing, please wait...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

call npm start
pause
