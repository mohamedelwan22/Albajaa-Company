# Stop all old processes
Write-Host "Stopping old processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null | Out-Null
Start-Sleep -Seconds 2

# Start Backend in a new window
Write-Host "Starting Backend..." -ForegroundColor Green
$backendPath = Join-Path $PSScriptRoot "artifacts\api-server"
$backendCmd = "cd '$backendPath'; pnpm dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# Wait for Backend to initialize
Write-Host "Waiting for Backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Start Frontend in a new window
Write-Host "Starting Frontend..." -ForegroundColor Blue
$frontendPath = Join-Path $PSScriptRoot "artifacts\albaja"
$frontendCmd = "cd '$frontendPath'; `$env:PORT=5173; `$env:BASE_PATH='/'; pnpm dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Start-Sleep -Seconds 3
Write-Host ""
Write-Host "[OK] Project is running!" -ForegroundColor Green
Write-Host "Frontend : http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend  : http://localhost:3001" -ForegroundColor Cyan
