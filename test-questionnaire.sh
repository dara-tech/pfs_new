#!/bin/bash

echo "🔍 Fetching tokens from API..."
TOKEN=$(curl -s http://localhost:3001/api/questionnaire/tokens 2>/dev/null | grep -o '"code":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ No tokens found or API not running."
    echo "   Make sure backend is running: cd backend && npm run dev"
    echo "   Or check your database for tokens in the 'tokens' table"
    exit 1
fi

echo "✅ Found token: $TOKEN"
echo ""
echo "📋 Questionnaire URLs:"
echo ""
echo "   👤 Client Questionnaire (Khmer):"
echo "      http://localhost:5173/client/$TOKEN/kh"
echo ""
echo "   👤 Client Questionnaire (English):"
echo "      http://localhost:5173/client/$TOKEN/en"
echo ""
echo "   🏥 Provider Questionnaire (Khmer):"
echo "      http://localhost:5173/provider/$TOKEN/kh"
echo ""
echo "   🏥 Provider Questionnaire (English):"
echo "      http://localhost:5173/provider/$TOKEN/en"
echo ""
