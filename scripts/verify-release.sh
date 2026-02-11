#!/bin/bash

set -e

echo "🔍 Verificando preparación para release..."

echo "✓ Verificando LICENSE..."
if [ ! -f LICENSE ]; then
  echo "❌ LICENSE no encontrado"
  exit 1
fi

echo "✓ Verificando package.json..."
if [ ! -f package.json ]; then
  echo "❌ package.json no encontrado"
  exit 1
fi

echo "✓ Verificando build..."
npm run build

echo "✓ Verificando archivos de build..."
test -f dist/index.js || (echo "❌ dist/index.js no encontrado" && exit 1)
test -f dist/index.cjs || (echo "❌ dist/index.cjs no encontrado" && exit 1)
test -f dist/index.global.js || (echo "❌ dist/index.global.js no encontrado" && exit 1)
test -f dist/index.d.ts || (echo "❌ dist/index.d.ts no encontrado" && exit 1)
test -f dist/index.d.cts || (echo "❌ dist/index.d.cts no encontrado" && exit 1)

echo "✓ Verificando tests..."
npm run test

echo "✓ Verificando typecheck..."
npm run typecheck

echo "✓ Verificando lint..."
npm run lint

echo "✅ Todo listo para release!"
