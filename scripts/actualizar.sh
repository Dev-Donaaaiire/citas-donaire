#!/bin/bash
set -e
echo "========================================================"
echo "  Krono Citas - Actualizador Automático"
echo "========================================================"
echo "Conectando con el repositorio oficial upstream..."
git remote add upstream https://github.com/Dev-Donaaaiire/citas-donaire.git 2>/dev/null || true
git fetch upstream main
echo "Sincronizando archivos del sistema..."
git checkout upstream/main -- src public package.json package-lock.json next.config.ts tsconfig.json README.md
git add -A
git commit -m "chore(krono): actualizacion automatica a la ultima version" || echo "Sin cambios nuevos para commitear"
git push origin main
echo ""
echo "========================================================"
echo "  ¡Listo! Cambios subidos a tu repositorio."
echo "  Vercel desplegará la nueva versión automáticamente."
echo "========================================================"