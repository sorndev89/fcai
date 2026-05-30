@echo off
REM ============================================================================
REM  Build Production Bundle
REM  =======================
REM  Double-click this file from File Explorer (OUTSIDE VS Code) to build the
REM  entire application — frontend + backend — into backend/dist/ for deployment.
REM
REM  Why run outside VS Code?
REM  On Windows, VS Code's file watcher locks files inside
REM  frontend\node_modules\.cache\nuxt\ during the Nuxt build, causing EPERM
REM  errors.  Running this batch file directly (not from VS Code's terminal)
REM  avoids those lock conflicts entirely.
REM
REM  What it does:
REM    1. Changes to the backend/ directory
REM    2. Runs: npm run build
REM       - Cleans build caches (node_modules\.cache, .vite-cache, etc.)
REM       - Builds the Nuxt frontend (SPA) → frontend\.output-dist\
REM       - Compiles backend TypeScript → backend\dist\
REM       - Copies frontend output → backend\dist\frontend\
REM    3. Pauses so you can see the result
REM ============================================================================

echo ============================================================================
echo  Building Production Bundle
echo ============================================================================
echo.

cd /d "%~dp0backend"

if not exist "package.json" (
    echo [ERROR] Could not find backend\package.json
    echo         Make sure you're running this from the project root folder.
    pause
    exit /b 1
)

echo [1/4] Cleaning caches...
echo.

call npm run build

if %ERRORLEVEL% neq 0 (
    echo.
    echo [FAILED] Build exited with error code %ERRORLEVEL%
    echo.
    echo If the error was EPERM ^(file locked^), close ALL VS Code windows
    echo and try running this batch file again.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ============================================================================
echo  BUILD SUCCESSFUL
echo ============================================================================
echo.
echo  To start the production server:
echo     cd backend
echo     set NODE_ENV=production
echo     node dist/index.js
echo.
echo  Or simply:
echo     npm start   ^(from the backend directory^)
echo.
pause
