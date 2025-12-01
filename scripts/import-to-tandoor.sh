#!/bin/bash

TANDOOR_URL="${TANDOOR_URL:-http://localhost:8080}"
TANDOOR_TOKEN="${TANDOOR_TOKEN}"

if [ -z "$TANDOOR_TOKEN" ]; then
  echo "❌ Error: TANDOOR_TOKEN environment variable not set"
  exit 1
fi

echo "🍳 Importing recipes to Tandoor at $TANDOOR_URL"
echo ""

success=0
failed=0

for json_file in generated/schema-org/*.json; do
  if [ "$(basename "$json_file")" != "index.json" ]; then
    filename=$(basename "$json_file")
    echo -n "Importing: $filename ... "
    
    response=$(curl -X POST "$TANDOOR_URL/api/recipe-from-source/" \
      -H "Authorization: Bearer $TANDOOR_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"data\": $(cat "$json_file" | jq -c '@json')}" \
      -s -w "%{http_code}" -o /tmp/tandoor_response.json)
    
    if [ "$response" = "200" ] || [ "$response" = "201" ]; then
      echo "✅ Success"
      ((success++))
    else
      echo "❌ Failed (HTTP $response)"
      cat /tmp/tandoor_response.json
      ((failed++))
    fi
  fi
done

echo ""
echo "📊 Import complete: $success succeeded, $failed failed"
