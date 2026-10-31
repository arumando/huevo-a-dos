#!/usr/bin/env bash
# Ejecuta todas las pruebas automatizadas. Requiere: cd tests && npm install && npx playwright install chromium
set -e
cd "$(dirname "$0")"
export SHOTS="${SHOTS:-/tmp}"
echo "== Niveles de Huevo a Dos";        node levels_check.mjs
echo "== Mapas de Aventuras";            node aventura_solver.mjs
echo "== Dos teléfonos: Huevo a Dos";    node smoke.js
echo "== Dos teléfonos: todos los juegos"; node games_smoke.js
echo "== Guardado y recuperación";       node persist.js
echo "== Reconexión";                    node reconnect.js
echo "== Tamaños de pantalla";           node screens.js
echo "Para medir la sincronización (tarda ~10 min): VIA=p2p node bench_sync.js  y  VIA=mqtt node bench_sync.js"
