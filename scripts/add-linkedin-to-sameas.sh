#!/bin/bash
# ================================================================
# 一鍵把 LinkedIn Company Page URL 加到全站 Organization schema
# 用法：
#   bash scripts/add-linkedin-to-sameas.sh https://www.linkedin.com/company/jdi-pulse-media
# ================================================================

set -e

LINKEDIN_URL="${1:-}"

if [ -z "$LINKEDIN_URL" ]; then
  echo "❌ Usage: bash scripts/add-linkedin-to-sameas.sh <LINKEDIN_URL>"
  echo "   Example: bash scripts/add-linkedin-to-sameas.sh https://www.linkedin.com/company/jdi-pulse-media"
  exit 1
fi

# Basic URL validation
if [[ ! "$LINKEDIN_URL" =~ ^https://www\.linkedin\.com/company/ ]]; then
  echo "❌ URL must start with https://www.linkedin.com/company/"
  exit 1
fi

cd "$(dirname "$0")/.."

echo "🔍 Looking for files with Organization sameAs..."
FILES=$(grep -rln '"sameAs": \[' --include="*.html" .)

if [ -z "$FILES" ]; then
  echo "❌ No files found with Organization sameAs"
  exit 1
fi

echo "📝 Files to update:"
echo "$FILES" | sed 's/^/  - /'
echo ""

UPDATED=0
SKIPPED=0

for file in $FILES; do
  # Skip if LinkedIn URL already exists in this file
  if grep -q "linkedin.com/company" "$file"; then
    echo "⏭  Skip $file (already has LinkedIn)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Insert LinkedIn URL into JDI Organization's sameAs arrays
  # Two patterns handled:
  #   1) sameAs contains instagram.com/pulse.pop9  → insert after it
  #   2) sameAs contains tiktok.com/@pulse.pop9 but NO instagram → insert after tiktok line
  # Any indent level is preserved.
  python3 << PYEOF
import re
from pathlib import Path

p = Path("$file")
content = p.read_text(encoding="utf-8")
url = "$LINKEDIN_URL"

# Skip lines that already have LinkedIn
if url in content:
    print(f"  ⏭  $file already contains this URL")
    raise SystemExit(0)

# Pattern 1: after instagram.com/pulse.pop9 line, keep indent
pat1 = re.compile(
    r'([ \t]+)"https://www\.instagram\.com/pulse\.pop9/?",\n'
)
new_content, n = pat1.subn(
    lambda m: m.group(0) + f'{m.group(1)}"{url}",\n',
    content
)

# Pattern 2: (fallback) after tiktok.com/@pulse.pop9 line if no IG was found
if n == 0:
    pat2 = re.compile(
        r'([ \t]+)"https://www\.tiktok\.com/@pulse\.pop9/?",\n'
    )
    new_content, n = pat2.subn(
        lambda m: m.group(0) + f'{m.group(1)}"{url}",\n',
        content
    )

if n > 0:
    p.write_text(new_content, encoding="utf-8")
    print(f"  ✓ Updated {n} sameAs block(s) in $file")
else:
    print(f"  ⚠ No matching JDI sameAs pattern in $file (skipped — check manually)")
PYEOF

  UPDATED=$((UPDATED + 1))
done

echo ""
echo "══════════════════════════════"
echo "✅ Done!"
echo "   Updated: $UPDATED files"
echo "   Skipped: $SKIPPED files (already had LinkedIn)"
echo "══════════════════════════════"
echo ""
echo "📋 Next steps:"
echo "   1. Review changes: git diff"
echo "   2. Also update the footer LinkedIn icon manually (see LINKEDIN_PLAYBOOK.md)"
echo "   3. Commit: git add -A && git commit -m 'feat(seo): add LinkedIn to Organization sameAs'"
