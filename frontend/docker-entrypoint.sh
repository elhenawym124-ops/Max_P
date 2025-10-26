#!/bin/sh

# Replace environment variables in built files
if [ -f /usr/share/nginx/html/index.html ]; then
    # Replace environment variable placeholders with actual values
    sed -i "s|%REACT_APP_API_URL%|${REACT_APP_API_URL:-https://www.mokhtarelhenawy.online/api/v1}|g" /usr/share/nginx/html/index.html
    sed -i "s|%REACT_APP_WS_URL%|${REACT_APP_WS_URL:-ws://153.92.223.119:3001}|g" /usr/share/nginx/html/index.html
    sed -i "s|%REACT_APP_APP_NAME%|${REACT_APP_APP_NAME:-Communication Platform}|g" /usr/share/nginx/html/index.html
    sed -i "s|%REACT_APP_APP_VERSION%|${REACT_APP_APP_VERSION:-1.0.0}|g" /usr/share/nginx/html/index.html
    sed -i "s|%NODE_ENV%|${NODE_ENV:-production}|g" /usr/share/nginx/html/index.html
fi

# Execute the main command
exec "$@"
