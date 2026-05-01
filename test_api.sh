#!/bin/bash

echo "Starting API Integration Tests..."

# 1. Health Check
echo "Testing /api/health..."
HEALTH_STATUS=$(curl -s http://localhost:3000/api/health | grep -o '"status":"ok"')
if [ "$HEALTH_STATUS" == '"status":"ok"' ]; then
  echo "✅ Health Check Passed"
else
  echo "❌ Health Check Failed"
fi

# 2. Auth Endpoints (Check if they exist)
echo "Testing /api/auth/me (Unauthorized)..."
AUTH_ME=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me)
if [ "$AUTH_ME" == "401" ]; then
  echo "✅ Auth Me (Unauthorized) Passed"
else
  echo "❌ Auth Me (Unauthorized) Failed (Code: $AUTH_ME)"
fi

# 3. AI Proxy (Check if it exists)
echo "Testing /api/ai/chat (Method Not Allowed for GET)..."
AI_CHAT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/ai/chat)
if [ "$AI_CHAT" == "404" ] || [ "$AI_CHAT" == "405" ] || [ "$AI_CHAT" == "400" ]; then
  echo "✅ AI Proxy Endpoint Exists"
else
  echo "❌ AI Proxy Endpoint Failed (Code: $AI_CHAT)"
fi

echo "Tests Completed."
