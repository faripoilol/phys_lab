#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${ROOT_DIR}/docs"

mkdir -p "${OUT_DIR}"
mkdir -p "${OUT_DIR}/assets"

cp "${ROOT_DIR}/index.html" "${OUT_DIR}/index.html"
cp "${ROOT_DIR}/styles.css" "${OUT_DIR}/styles.css"
cp "${ROOT_DIR}/script.js" "${OUT_DIR}/script.js"
cp "${ROOT_DIR}/pl.png" "${OUT_DIR}/pl.png"
cp "${ROOT_DIR}/index.html" "${OUT_DIR}/404.html"
cp -R "${ROOT_DIR}/assets/." "${OUT_DIR}/assets/"

cat > "${OUT_DIR}/_headers" <<'EOF'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(self), geolocation=(), microphone=()
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self'
  Cache-Control: public, max-age=300
EOF

cat > "${OUT_DIR}/_redirects" <<'EOF'
/home / 302
/docs /#manual 302
/experiments /#live-lab 302
/about /#overview 302
/github https://github.com/faripoilol/phys_lab 302
EOF

: > "${OUT_DIR}/.nojekyll"

printf 'Static site bundle updated in %s\n' "${OUT_DIR}"
