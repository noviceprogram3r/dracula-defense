#!/bin/bash
echo "Starting local Python HTTP server on port 8000..."
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
echo "Server started. Generating public web link via localtunnel..."
echo "(Press Ctrl+C to stop sharing)"
npx localtunnel --port 8000

kill $SERVER_PID
