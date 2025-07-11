#!/bin/bash

# Script pour tester la fonction de sync corrigée
# Usage: ./scripts/test-fixed-sync.sh

set -e

echo "🔄 Testing corrected COMPL-AI sync function..."
echo ""

# Déployer la fonction corrigée
echo "📤 Deploying updated Edge Function..."
cd /Users/hugofaye/workspace/maydai/maydai-nextjs

# Déployer la fonction
supabase functions deploy compl-ai-sync --project-ref YOUR_PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
else
    echo "❌ Function deployment failed!"
    exit 1
fi

echo ""

# Tester la fonction
echo "🧪 Testing the corrected function..."

# Appeler l'endpoint de sync
curl -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -d '{}' \
    "https://YOUR_PROJECT_REF.supabase.co/functions/v1/compl-ai-sync" \
    -v

echo ""
echo "🎯 Test completed!"
echo ""
echo "🔍 Check the results:"
echo "   1. Look at the function logs in Supabase dashboard"
echo "   2. Check the database for updated scores"
echo "   3. Verify that gpt-4-1106-preview has correct mapping:"
echo "      - Representation Bias: N/A (not 0.98)"
echo "      - Prejudiced Answers: 0.98 (correct value)"