#!/bin/bash
# Actualiza a la última versión publicada y la sube a tu repositorio.
set -e
cd "$(dirname "$0")/.."
node scripts/update.mjs --push
