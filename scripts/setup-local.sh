#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> PBMP local setup"

if ! command -v node >/dev/null; then
  echo "Error: Node.js 20+ required. Install from https://nodejs.org/"
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Error: Node.js 20+ required (found $(node -v))"
  exit 1
fi

echo "==> Installing dependencies"
npm install
npm install --prefix client
npm install --prefix server

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

mkdir -p data/requirements

echo "==> Validating sample requirement schema"
node scripts/validate-requirements.mjs

echo ""
echo "Setup complete."
echo ""
echo "Start development:"
echo "  npm run dev"
echo ""
echo "Then open:"
echo "  http://localhost:5173  (Blockly UI with hot reload)"
echo "  http://localhost:3000/api/health  (API)"
echo ""
echo "Production-like local run:"
echo "  npm run build && npm run start --prefix server"
echo "  http://localhost:3000"
