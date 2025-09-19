#!/bin/bash

echo "🧪 Testing Production Microservices..."
echo ""

PRODUCTION_URL="https://application.mihas.edu.zm"

echo "1. Testing Auth Service..."
curl -s -o /dev/null -w "   Auth Service: %{http_code} %{url_effective}\n" \
  -X POST "$PRODUCTION_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'

echo "2. Testing Applications Service..."
curl -s -o /dev/null -w "   Applications Service: %{http_code} %{url_effective}\n" \
  "$PRODUCTION_URL/api/applications"

echo "3. Testing Documents Service..."
curl -s -o /dev/null -w "   Documents Service: %{http_code} %{url_effective}\n" \
  -X POST "$PRODUCTION_URL/api/documents/upload" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.pdf"}'

echo "4. Testing Notifications Service..."
curl -s -o /dev/null -w "   Notifications Service: %{http_code} %{url_effective}\n" \
  -X POST "$PRODUCTION_URL/api/notifications/send" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","type":"test","title":"Test","message":"Test"}'

echo "5. Testing Analytics Service..."
curl -s -o /dev/null -w "   Analytics Service: %{http_code} %{url_effective}\n" \
  "$PRODUCTION_URL/api/analytics?action=metrics"

echo ""
echo "✅ Service testing complete!"
echo ""
echo "Expected responses:"
echo "- Auth Service: 401 (Unauthorized - correct)"
echo "- Applications Service: 401 (Unauthorized - correct)" 
echo "- Documents Service: 401 (Unauthorized - correct)"
echo "- Notifications Service: 401 (Unauthorized - correct)"
echo "- Analytics Service: 401 (Unauthorized - correct)"