@echo off
echo Starting Frontend Server with Smart Environment Configuration...
echo.
cd /d "E:\chtbotai.1\site\Forntend"
echo Current directory: %CD%
echo.
echo Running: npx vite --port 3000
npx vite --port 3000
pause