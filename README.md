# Isla Nido

Nuestro parque de juegos privado para dos personas, cada quien en su teléfono.
**Para jugar:** https://arumando.github.io/huevo-a-dos/

1. Una persona abre el enlace, escribe su nombre y elige su pájaro.
2. Toca **Invitar a mi pareja** y manda el enlace. La otra persona entra directo a la misma sala, sin cuentas.
3. En la plaza se ven los dos pájaros. Elijan un portal, toquen **Jugar juntos** y la otra persona recibe la invitación.

La versión original de Huevo a Dos sigue disponible en [`/clasico/`](https://arumando.github.io/huevo-a-dos/clasico/).

## Mundos y juegos

| Mundo | Juegos | Cómo se juega |
|---|---|---|
| Huevo a Dos | 6 escenarios × 3 niveles (acantilado, bosque, hielo, cavernas, volcán, cielo) | Cooperativo de precisión. También en un teléfono. |
| Escape Room | 3 habitaciones con 3 cerraduras | Quien explora ve la habitación; quien archiva tiene los documentos. Acertijos nuevos en cada partida. |
| Desactiva la bomba | 5 bombas | Una persona ve la bomba y la otra el manual. Módulos: palancas, luces, símbolos, cálculo. |
| Detectives | 3 casos | Cada quien tiene un expediente distinto. Acusan juntos en la pizarra. |
| Aventuras | 3 mapas (isla, mansión, templo) | Rompecabezas cooperativo por casillas: placas, rejas, llaves, rocas, casillas de un solo jugador. |
| Minijuegos | 8 juegos | Dibuja y adivina, ¿Qué tanto me conoces?, Memoria, Tres en raya, Piedra-papel-tijera, Carrera de toques, Reflejos, Rompecabezas. |

Progresión: experiencia y nivel, monedas, tienda de accesorios para el pájaro, 16 logros, misiones semanales en pareja, medallas por nivel, estadísticas e historial.

## Arquitectura

Sin compilación ni servidor propio: módulos ES que GitHub Pages sirve tal cual.

```
index.html            entrada
css/app.css           diseño de toda la plataforma
js/main.js            arranque y navegación
js/core/              util, store (guardado), progress (XP, logros, misiones), audio
js/net/link.js        transporte: MQTT (servidor público) + WebRTC directo, reloj compartido
js/net/room.js        sala de la pareja: presencia, chat, invitaciones, sesiones de juego
js/ui/                plaza, mundos, bienvenida, avatares, hojas (chat, logros, ajustes)
js/games/registry.js  catálogo de mundos y juegos
js/games/common.js    base para juegos de interfaz (estado con autoridad del anfitrión, temporizador)
js/games/huevo/       motor de física, niveles, render, sincronización y juego
js/games/<juego>/     escape, bomba, detective, aventura, mini/*
vendor/mqtt.min.js    MQTT.js 5.10.1 (MIT)
clasico/              Huevo a Dos original, intacto
tests/                pruebas automatizadas (no se usan para jugar)
```

### Red

- **Servidor MQTT público** (EMQX, con HiveMQ de respaldo): presencia, chat, invitaciones, señalización y guardado. Siempre disponible.
- **WebRTC directo** entre los dos teléfonos cuando la red lo permite: canal rápido (sin reintentos) y canal fiable. Si se cae, el tráfico vuelve a MQTT sin salir de la sala.
- Mensajes **rápidos** (posiciones, pueden perderse) y **fiables** (eventos, QoS 1, sin duplicados).
- **Reloj compartido** por pings: se usa para la interpolación y para que las salidas de las carreras y los reflejos sean justas.

Cada juego usa lo que necesita: Huevo a Dos manda fotos de la física a 30 Hz (20 Hz por servidor, 5 Hz si nada se mueve); los juegos de interfaz solo mandan acciones y estado cuando cambian.

### Sincronización de Huevo a Dos

- El anfitrión simula la física (autoridad). Su pájaro y el del invitado se mueven al instante en su propio teléfono.
- Invitado: búfer adaptativo (cubre el 98 % de los retrasos recientes), interpolación de Hermite y suavizado de correcciones.
- Anfitrión: predice el pájaro del invitado con su velocidad y la latencia medida, y lo sigue con los mismos límites físicos que un pájaro local, para que la cuerda no dé tirones.

### Guardado

| Tipo | Dónde |
|---|---|
| Individual (nombre, pájaro, monedas, XP, accesorios) | este teléfono + servidor |
| Compartido (niveles, medallas, logros, misiones, estadísticas, historial) | los dos teléfonos + servidor |
| Partida en curso (nivel, bandera, huevos rotos, tiempo) | dentro del compartido; se guarda en cada bandera y al cerrar |

Las copias se fusionan sin conflictos (contadores con máximo, récords con mínimo, conjuntos con unión). También hay un **código de respaldo** en Ajustes para pasar todo a otro teléfono.

### Añadir un juego

1. Crear `js/games/<carpeta>/<archivo>.js` que exporte `mount(root, ctx)` y devuelva `{ destroy() }`.
2. Para juegos de interfaz, usar `shell()` y `createSync()` de `js/games/common.js`: el anfitrión aplica las acciones con `reduce(estado, acción, quién)` y el estado llega solo al otro teléfono.
3. Registrarlo en `js/games/registry.js` dentro de un mundo.

## Pruebas

```
cd tests && npm install && npx playwright install chromium && bash run_all.sh
```

Todas son **automatizadas y simuladas** (navegador Chromium con perfil de iPhone 13 y un servidor MQTT local con retraso y pérdida emulados). **No se han hecho pruebas con dos teléfonos físicos.**

| Prueba | Qué verifica |
|---|---|
| `levels_check.mjs` | 18 niveles: apariciones libres, paso mínimo, nido libre, el huevo no se rompe solo |
| `aventura_solver.mjs` | cada mapa se puede completar (búsqueda exhaustiva) |
| `smoke.js`, `games_smoke.js` | dos teléfonos: sala por enlace, invitación, los 13 juegos, interacciones, salida |
| `persist.js` | recarga del anfitrión, recuperación desde el servidor sin datos locales, continuar desde la bandera, respaldo |
| `reconnect.js` | 16 s sin red en plena partida y reanudación |
| `screens.js` | iPhone SE, iPhone 13, Pixel 7, iPad y horizontal sin desbordes |
| `bench_sync.js` | métricas de sincronización con red emulada |

### Medición de la sincronización (promedio de 2–3 corridas, movimiento automático sin correcciones)

| Condición | Versión original | Nueva, por servidor | Nueva, directa |
|---|---|---|---|
| Wifi (~100 ms): saltos del pájaro de la pareja | 6,5 | 0 | 0 |
| Datos móviles (~180 ms ± 60): huevos rotos | 0 | 0 | 0 |
| Móviles con picos de 250 ms: saltos | 20 | 4 | 1 |
| Móviles con picos: retraso visual | 415 ms | 303 ms | 275 ms |
| Móviles con picos: huevos rotos | 0 de 2 | 1 de 3 | 0 de 2 |
| 5 % de pérdida: huevos rotos | — | — | 0 de 2 |
| Mensajes por segundo | 40 | 36 | 57 |

## Fase de mejora: rediseño, usabilidad y errores

- **Diseño**: sistema visual nuevo (paneles con profundidad, botones con estado de pulsado, fondo ilustrado, transiciones, confeti al ganar), íconos propios en una sola rejilla, pájaros con sombreado, mejillas, copete y parpadeo, ilustración propia para cada mundo y un portal distinto por mundo en la plaza. La plaza se adapta a pantallas altas o anchas.
- **Botón «Invitar a mi pareja»**: ver los errores 16 y 17 abajo. Ahora está en su propia tarjeta del panel y una prueba revisa que ningún botón se mueva al pulsarlo.
- **Desactiva la bomba**: mismas reglas y mismo reto, presentados con claridad: casillas numeradas del 1 al 9, contador «Luz 2 de 3» con el color escrito, el módulo abierto se comparte y el manual salta a esa página, confirmaciones de acierto y error en los dos teléfonos, manual por módulo (qué es, lo que ve tu pareja, regla, procedimiento, ejemplo calculado con las reglas del juego, cuándo se completa), diagramas de cada transformación de las luces y una práctica interactiva.
- **Todos los juegos**: botón «?» con instrucciones, instrucciones automáticas la primera vez, estado de carga, avisos de acierto y error, tarjeta de victoria con efectos y botón para volver al mundo. Escape Room indica qué cerradura están resolviendo y qué debe decir cada quien; Detectives cuenta cuántas respuestas coinciden; Aventuras usa íconos dibujados, leyenda y flechas más grandes.
- **Móvil**: todas las áreas táctiles miden al menos 44 px, nada interactivo queda tapado, avisos que no cubren los controles, ajuste al teclado del iPhone y diseño sin desbordes desde 320 px de ancho.

### Pruebas nuevas (automatizadas, simuladas)

| Prueba | Qué verifica |
|---|---|
| `invite_button.js` | ningún botón de la plaza se mueve al pulsarlo (estado `:active` forzado) y «Invitar» responde a un toque |
| `ux_audit.js`, `ux_audit_duo.js` | en todas las pantallas y juegos, desde los dos roles, en iPhone SE, iPhone 13, Pixel 7 y horizontal: 914 elementos revisados, ninguno se mueve, ninguno mide menos de 44 px, ninguno está tapado |
| `usability_flow.js` | con toques reales: entrar, nombre y pájaro, invitar, segundo teléfono por enlace, caminar a un portal, los seis mundos con sus instrucciones, iniciar partida, salir y conservar el progreso (iPhone 13, iPhone SE y Pixel 7) |
| `bomb_play.js` | una bomba completa resuelta por la interfaz: quien la ve lee las luces en pantalla y toca; el manual sigue al módulo abierto; un error a propósito se ve en ambos teléfonos |

Siguen sin hacerse pruebas con personas ni con dos teléfonos físicos.

## Errores encontrados y corregidos durante esta versión

1. Si los dos elegían el mismo color, los pájaros se veían idénticos → la pareja se dibuja con un color que contraste.
2. El emulador de red de las pruebas desordenaba datos y simulaba pérdidas que no existen en TCP → cola ordenada; se repitieron todas las mediciones.
3. La suscripción MQTT era QoS 0: los mensajes "fiables" podían perderse con carga → QoS 1.
4. Con picos de red, el pájaro remoto se ponía al día de golpe y daba tirones a la cuerda → límites físicos y predicción.
5. Al corregir lo anterior, la latencia se contaba como "dato viejo" y se apagaba la predicción; el huevo se resbalaba (3 de 3 corridas) → se separaron latencia y antigüedad del dato.
6. Niveles con pisos de lava o pinchos de lado a lado que bloqueaban el paso, pasos de 78–80 px, una bandera dentro de una zona de viento y una bola de fuego encima de otra bandera → corregidos y verificados automáticamente.
7. El templo de Aventuras se podía resolver sin las rocas ni la reja → rediseñado; se comprobó que cada mecánica es necesaria.
8. Al salir de un juego, la pareja se quedaba dentro → ambos vuelven al mundo; si se cae la conexión, aparece una pantalla de espera.
9. Aparecía el texto "null" en el Escape Room → la interfaz ignora elementos vacíos.
10. Íconos dentro de botones se dibujaban gigantes → tamaño fijo.
11. Los dos pájaros aparecían encimados en la plaza → cada quien aparece en su lugar.
12. Un perfil incompleto se reemplazaba por uno vacío y se perdía la identidad → lo guardado manda.
13. Si el anfitrión recargaba, el invitado no se enteraba → se detecta la sesión cerrada.
14. En horizontal, la plaza quedaba aplastada → dos columnas.
15. El cielo tenía poco contraste; los avisos tapaban la barra superior; etiquetas de nivel confusas; sonidos repetidos en dos minijuegos → corregidos.
16. **«Invitar a mi pareja» se movía al tocarlo**: estaba centrado con `transform: translateX(-50%)` y el estilo de botón pulsado (`:active`) reemplazaba ese `transform` por `translateY(1px)`. Al apoyar el dedo, el botón saltaba 94 px a la derecha y Safari cancelaba el toque → ya nada se posiciona con `transform` y el pulsado se muestra con la sombra, sin mover el botón.
17. **La plaza y las pantallas de mundo se reconstruían cada ~3 s** cuando la pareja estaba conectada (cada latido de presencia). Un toque en ese momento caía sobre un botón que desaparecía y se reiniciaba el nivel elegido → solo se avisa y se redibuja cuando algo visible cambia, y las elecciones se conservan.
18. El teclado del cálculo de la bomba tenía tantas casillas como cifras del resultado (daba una pista) → longitud libre.
19. El manual de la bomba no seguía al primer módulo → corregido.
20. Las instrucciones de la primera vez aparecían con retraso encima del juego y se quedaban abiertas al salir → aparecen al abrir y se cierran al cambiar de pantalla.
21. En pantallas de 320 px, las tarjetas de juego se salían por la derecha → columnas que pueden encogerse.
22. Varios avisos de logros tapaban el título de la tarjeta de victoria → aparecen después y abajo.

## Limitaciones conocidas

- Falta probar con dos teléfonos reales a distancia.
- El canal directo (WebRTC) puede no abrirse en algunas redes de datos móviles; entonces se juega por el servidor, con algo más de retraso.
- Los servidores MQTT públicos son gratuitos y no garantizan disponibilidad ni que conserven los mensajes guardados para siempre (por eso todo se guarda también en los dos teléfonos y existe el código de respaldo).
- Las salas no tienen contraseña: quien tenga el enlace puede entrar.
- Con el iPhone en silencio no se oyen los sonidos.
