#!/bin/bash

echo "🍳 Exporting all recipes..."

# Create directories
mkdir -p generated/schema-org generated/markdown generated/json

# Export each recipe
for recipe in recipes/*.cook; do
  if [ -f "$recipe" ]; then
    filename=$(basename "$recipe" .cook)
    echo "📝 Processing: $filename"
    
    # Schema.org JSON (for Tandoor)
    cook recipe "$recipe" -f schema --pretty > "generated/schema-org/${filename}.json"
    
    # Markdown (for browsing)
    cook recipe "$recipe" -f markdown > "generated/markdown/${filename}.md"
    
    # JSON (for programmatic access)
    cook recipe "$recipe" -f json --pretty > "generated/json/${filename}.json"
  fi
done

echo ""
echo "✅ Export complete!"
echo "📊 Schema.org: $(ls generated/schema-org/*.json 2>/dev/null | wc -l) files"
echo "📝 Markdown: $(ls generated/markdown/*.md 2>/dev/null | wc -l) files"
echo "🔧 JSON: $(ls generated/json/*.json 2>/dev/null | wc -l) files"
