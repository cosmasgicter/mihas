@echo off
echo Installing MCP server dependencies...
npm install

echo.
echo Setup complete! 
echo.
echo Next steps:
echo 1. Update SUPABASE_ANON_KEY in .env.mcp and mcp-config.json
echo 2. Add mcp-config.json to your Amazon Q settings
echo 3. Test with: npm start
echo.
pause