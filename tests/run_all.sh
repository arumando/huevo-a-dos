#!/usr/bin/env bash
# Ejecuta todas las pruebas automatizadas. Requiere: cd tests && npm install && npx playwright install chromium
set -e
cd "$(dirname "$0")"
export SHOTS="${SHOTS:-/tmp}"
echo "== Niveles de Huevo a Dos";             node levels_check.mjs
echo "== Mapas de Aventuras";                 node aventura_solver.mjs
echo "== Dos teléfonos: Huevo a Dos";         node smoke.js
echo "== Dos teléfonos: todos los juegos";    node games_smoke.js
echo "== Bomba completa por la interfaz";     node bomb_play.js
echo "== Flujo de uso con toques";            node usability_flow.js
echo "== Botón Invitar y botones de la plaza"; node invite_button.js
echo "== Auditoría móvil (un teléfono)";      node ux_audit.js
echo "== Auditoría móvil (dos teléfonos)";    node ux_audit_duo.js
echo "== Guardado y recuperación";            node persist.js
echo "== Reconexión";                         node reconnect.js
echo "== Tamaños de pantalla";                node screens.js
echo "Para medir la sincronización (tarda ~10 min): VIA=p2p node bench_sync.js  y  VIA=mqtt node bench_sync.js"
