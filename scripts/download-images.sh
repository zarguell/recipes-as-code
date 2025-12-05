#!/usr/bin/env bash
set -euo pipefail

# Directory to store images (relative to repo root)
IMG_DIR="static/images/recipes"

mkdir -p "$IMG_DIR"

echo "🔍 Scanning .cook files for image URLs..."

# Loop over all .cook files in recipes/
for recipe in recipes/*.cook; do
  [ -f "$recipe" ] || continue

  slug="$(basename "$recipe" .cook)"

  # Extract YAML front matter between --- markers and read image: line
  fm="$(awk '/^---$/{flag=!flag;next}flag' "$recipe")"
  image_url="$(printf '%s\n' "$fm" \
    | grep -i "^image:" \
    | head -1 \
    | sed 's/image:[[:space:]]*//I; s/\[//g; s/\]//g' \
    | tr -d '"' \
    || true)"

  if [ -z "$image_url" ]; then
    echo "⚪ No image for $slug"
    continue
  fi

  # Strip Markdown URL wrapper if present: [https://...](https://...)
  # Keep first URL-like token
  image_url="$(printf '%s\n' "$image_url" \
    | sed -E 's/\((https?:[^)]*)\).*/\1/' \
    | sed -E 's/^\[(https?:[^]]*)\].*/\1/' \
    | awk '{print $1}')"

  if [ -z "$image_url" ]; then
    echo "⚪ Could not parse image URL for $slug"
    continue
  fi

  # Strip query string to get extension
  base_name="$(basename "${image_url%%\?*}")"
  ext="${base_name##*.}"
  [ "$ext" = "$base_name" ] && ext="jpg"  # fallback

  local_rel="images/recipes/${slug}.${ext}"
  local_path="${IMG_DIR}/${slug}.${ext}"

  if [ -f "$local_path" ]; then
    echo "✅ Already have $local_rel"
  else
    echo "⬇️  Downloading $image_url -> $local_rel"
    curl -L --fail --silent --show-error "$image_url" -o "$local_path" || {
      echo "⚠️  Failed to download $image_url"
      rm -f "$local_path"
      continue
    }
  fi

  # Update image field in front matter to point to local path
  # Keep everything else the same
  tmpfile="$(mktemp)"
  awk -v newimg="/${local_rel}" '
    BEGIN {in_fm = 0}
    /^---$/ {
      print
      if (in_fm == 0) {
        in_fm = 1
        next
      } else {
        in_fm = 0
        next
      }
    }
    {
      if (in_fm == 1 && $0 ~ /^[[:space:]]*image:/i) {
        print "image: \"" newimg "\""
      } else {
        print
      }
    }
  ' "$recipe" > "$tmpfile"
  mv "$tmpfile" "$recipe"

  echo "📝 Updated image for $slug -> /${local_rel}"
done

echo "🎉 Done. Commit static/images/recipes and updated .cook files."
