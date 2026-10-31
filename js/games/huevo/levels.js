// Niveles de Huevo a Dos. Cada escenario tiene su propio tema visual, mecánicas y nido.
// Formato compacto: walls [x,y,w,h,material], spikes [x,y,w,h,dir], saws [cx,cy,r,ax,ay,periodo,fase],
// movers [x,y,w,h,ax,ay,periodo,fase,mat], faders [x,y,w,h,encendido,apagado,fase], crumbles [x,y,w,h],
// hidden [x,y,w,h], winds [x,y,w,h,fx,fy,periodo,fase], lava [x,y,w,h], fireballs [cx,cy,altura,periodo,fase],
// slopes [x1,y1,x2,y2,mat], bridges [x1,y1,x2,y2,comba,tramos], cps [y | [y,x]], nest {x,y}, signs [y,texto].
export const SCENARIOS = [
  { id: 'acantilado', name: 'El acantilado', blurb: 'Donde empezó todo: pinchos, sierras y la chimenea.' },
  { id: 'bosque', name: 'El bosque encantado', blurb: 'Árboles gigantes, puentes colgantes, espinas y troncos que se mueven.' },
  { id: 'hielo', name: 'La montaña helada', blurb: 'Hielo resbaloso, caminos inclinados, carámbanos y viento que empuja.' },
  { id: 'cavernas', name: 'Las cavernas', blurb: 'Oscuridad, túneles estrechos y rocas de cristal que solo se ven de cerca.' },
  { id: 'volcan', name: 'El volcán', blurb: 'Lava, bolas de fuego, rocas que desaparecen y suelos que se rompen.' },
  { id: 'cielo', name: 'El cielo', blurb: 'Islas de nubes que rebotan, puentes que se mueven y tramos de mucha precisión.' }
];

export const LEVELS = [
  {
    id: 'acantilado-1', scenario: 'acantilado', n: 1, name: 'La subida original', theme: 'acantilado', top: 3800, par: 300,
    walls: [[0, 300, 55, 420], [305, 300, 55, 420], [150, 520, 60, 44], [150, 880, 60, 300], [0, 1480, 230, 26], [130, 1700, 230, 26], [0, 2650, 120, 420], [240, 2650, 120, 420]],
    spikes: [[210, 1010, 150, 14, 'u'], [0, 1506, 230, 12, 'u'], [130, 1726, 230, 12, 'u'], [120, 2700, 10, 320, 'r'], [230, 2700, 10, 320, 'l']],
    saws: [[180, 2100, 24, 120, 0, 3.2, 0], [180, 2280, 24, 120, 0, 2.6, 0.5], [130, 3300, 22, 0, 80, 2.4, 0], [230, 3300, 22, 0, 80, 2.4, 0.5], [180, 3490, 24, 110, 0, 2.0, 0.25]],
    signs: [[150, 'Arrastra el dedo para volar'], [205, 'Mantengan la cuerda derechita'], [790, 'Solo el huevo es frágil'], [1400, 'Ni rozar los pinchos'], [1960, 'Ojo con las sierras'], [2590, 'La chimenea'], [3780, '¡El nido! Bájenlo suavecito']],
    cps: [0, 1300, 2500], nest: { x: 180, y: 3660 }
  },
  {
    id: 'acantilado-2', scenario: 'acantilado', n: 2, name: 'Las cornisas', theme: 'acantilado', top: 2850, par: 240,
    walls: [[0, 400, 70, 300], [290, 400, 70, 300], [0, 900, 100, 300], [0, 1500, 220, 22], [140, 1700, 220, 22], [0, 2150, 110, 420], [250, 2150, 110, 420]],
    movers: [[140, 550, 80, 18, 70, 0, 3.5, 0], [210, 1040, 90, 18, 0, 60, 3, 0.25]],
    spikes: [[100, 920, 10, 260, 'r'], [0, 1522, 220, 10, 'u'], [140, 1722, 220, 10, 'u']],
    saws: [[180, 1610, 20, 110, 0, 3, 0], [180, 2360, 18, 0, 120, 4, 0]],
    signs: [[180, 'Las cornisas se mueven'], [1420, 'Zigzag con pinchos'], [2110, 'Una sierra sube y baja']],
    cps: [0, 1350, 2050], nest: { x: 180, y: 2700 }
  },
  {
    id: 'acantilado-3', scenario: 'acantilado', n: 3, name: 'La tormenta', theme: 'acantilado', top: 3050, par: 300,
    walls: [[0, 850, 240, 24], [0, 2300, 100, 450], [260, 2300, 100, 450]],
    winds: [[0, 300, 360, 400, 260, 0, 3, 0], [0, 1000, 360, 400, -280, 0, 2.5, 0.3], [100, 1700, 160, 250, 0, 520, 4, 0], [100, 2350, 160, 180, 300, 0, 2, 0], [100, 2550, 160, 180, -300, 0, 2, 0.5]],
    spikes: [[345, 320, 15, 360, 'l'], [0, 1020, 15, 360, 'r'], [100, 1990, 160, 12, 'd'], [100, 2320, 8, 410, 'r'], [252, 2320, 8, 410, 'l']],
    saws: [[200, 1200, 20, 0, 100, 3, 0]],
    signs: [[200, 'El viento empuja el huevo'], [1640, 'Corriente hacia arriba: la cuerda arriba del huevo'], [2270, 'Ráfagas cruzadas']],
    cps: [0, 1550, 2200], nest: { x: 180, y: 2900 }
  },
  {
    id: 'bosque-1', scenario: 'bosque', n: 1, name: 'Entre raíces', theme: 'bosque', top: 2450, par: 200,
    walls: [[40, 250, 50, 400], [270, 250, 50, 400], [90, 420, 50, 14, 'wood'], [220, 560, 50, 14, 'wood'], [0, 1100, 40, 400], [320, 1100, 40, 400], [0, 1700, 130, 300], [230, 1700, 130, 300]],
    bridges: [[0, 820, 220, 820, 24, 7], [0, 2200, 240, 2200, 22, 7]],
    movers: [[60, 1200, 90, 16, 60, 0, 3, 0, 'wood'], [210, 1350, 90, 16, -60, 0, 3, 0, 'wood']],
    spikes: [[40, 1150, 8, 300, 'r'], [312, 1150, 8, 300, 'l'], [130, 1750, 8, 200, 'r'], [222, 1750, 8, 200, 'l']],
    signs: [[170, 'Bienvenidos al bosque'], [760, 'Un puente colgante'], [1050, 'Troncos que flotan'], [1650, 'Camino estrecho con espinas']],
    cps: [0, 980, 1580], nest: { x: 180, y: 2330 }
  },
  {
    id: 'bosque-2', scenario: 'bosque', n: 2, name: 'Puentes colgantes', theme: 'bosque', top: 2650, par: 240,
    walls: [[150, 1200, 60, 500]],
    bridges: [[0, 320, 250, 320, 26, 8], [110, 620, 360, 620, 26, 8], [0, 920, 240, 920, 30, 8], [0, 2000, 200, 2000, 20, 7], [160, 2200, 360, 2200, 20, 7]],
    movers: [[20, 1430, 100, 14, 0, 80, 3.5, 0, 'wood'], [200, 2080, 70, 14, 60, 0, 2.5, 0, 'wood']],
    spikes: [[210, 1300, 8, 300, 'r']],
    signs: [[200, 'Los puentes se mecen'], [1140, 'Rodeen el árbol'], [1930, 'Puentes y troncos']],
    cps: [0, 1060, 1820], nest: { x: 180, y: 2480 }
  },
  {
    id: 'bosque-3', scenario: 'bosque', n: 3, name: 'El árbol madre', theme: 'bosque', top: 3250, par: 330,
    walls: [[0, 300, 120, 500], [240, 300, 120, 500], [0, 1850, 130, 200], [230, 1850, 130, 200], [0, 2150, 190, 180], [290, 2150, 70, 180]],
    bridges: [[0, 900, 230, 900, 28, 8], [0, 2650, 250, 2650, 24, 8], [110, 2850, 360, 2850, 24, 8]],
    movers: [[40, 1250, 110, 14, 90, 0, 3, 0, 'wood'], [210, 1450, 110, 14, -90, 0, 3, 0, 'wood']],
    spikes: [[120, 420, 8, 80, 'r'], [232, 600, 8, 80, 'l'], [0, 1300, 10, 300, 'r'], [350, 1300, 10, 300, 'l']],
    saws: [[180, 2750, 18, 110, 0, 3.4, 0]],
    signs: [[220, 'El tronco hueco'], [1160, 'Troncos cruzados'], [1800, 'Raíces en curva'], [2560, 'La copa del árbol']],
    cps: [0, 1050, 1750, 2480], nest: { x: 180, y: 3080 }
  },
  {
    id: 'hielo-1', scenario: 'hielo', n: 1, name: 'Pendientes', theme: 'hielo', mat: 'ice', top: 2400, par: 210,
    walls: [[240, 900, 120, 20], [0, 1200, 130, 24], [230, 1200, 130, 24]],
    slopes: [[0, 300, 200, 420], [360, 650, 150, 780], [0, 1800, 160, 1750], [200, 1950, 360, 2010]],
    winds: [[0, 1250, 360, 250, -200, 0, 3, 0]],
    spikes: [[0, 1260, 12, 220, 'r']],
    signs: [[180, 'El hielo resbala'], [1120, 'Viento hacia la izquierda'], [1690, 'Rampas de hielo']],
    cps: [0, 1000, 1600], nest: { x: 180, y: 2230 }
  },
  {
    id: 'hielo-2', scenario: 'hielo', n: 2, name: 'Puentes de hielo', theme: 'hielo', mat: 'ice', top: 2700, par: 260,
    slopes: [[0, 350, 230, 350], [130, 650, 360, 650], [0, 1850, 200, 1950], [360, 2050, 160, 2150], [0, 2250, 200, 2350]],
    movers: [[40, 1200, 100, 16, 80, 0, 3, 0, 'ice'], [220, 1400, 100, 16, -80, 0, 3, 0.5, 'ice']],
    winds: [[0, 700, 360, 250, 220, 0, 2.5, 0], [0, 1800, 360, 600, 0, 250, 3, 0]],
    spikes: [[20, 330, 200, 12, 'd'], [140, 630, 200, 12, 'd'], [0, 1150, 12, 300, 'r'], [348, 1150, 12, 300, 'l']],
    signs: [[200, 'Carámbanos debajo de los puentes'], [1060, 'Hielo flotante'], [1760, 'El aire sube']],
    cps: [0, 950, 1700], nest: { x: 180, y: 2520 }
  },
  {
    id: 'hielo-3', scenario: 'hielo', n: 3, name: 'La cumbre', theme: 'hielo', mat: 'ice', top: 3250, par: 340,
    walls: [[0, 300, 110, 500], [250, 300, 110, 500], [0, 1950, 130, 30], [230, 1950, 130, 30], [0, 2150, 90, 30], [190, 2150, 170, 30]],
    slopes: [[0, 1100, 170, 1170], [360, 1300, 190, 1370], [0, 1500, 170, 1570], [0, 2600, 240, 2650]],
    winds: [[110, 350, 140, 200, 250, 0, 2, 0], [110, 580, 140, 200, -250, 0, 2, 0.5], [0, 1850, 360, 300, 0, -300, 3, 0], [0, 2700, 360, 250, -260, 0, 2.2, 0]],
    spikes: [[10, 2570, 220, 10, 'd'], [0, 2710, 12, 230, 'r']],
    signs: [[220, 'Ráfagas en la chimenea'], [1020, 'Escaleras de hielo'], [1800, 'El viento aplasta: suave'], [2500, 'La cumbre']],
    cps: [0, 950, 1700, 2400], nest: { x: 180, y: 3080 }
  },
  {
    id: 'cavernas-1', scenario: 'cavernas', n: 1, name: 'La entrada', theme: 'cavernas', top: 2450, par: 220,
    walls: [[0, 250, 100, 400], [260, 250, 100, 400], [100, 620, 60, 30], [0, 1050, 140, 450], [240, 1050, 120, 450], [0, 2050, 130, 30], [230, 2050, 130, 30]],
    hidden: [[200, 800, 60, 14], [40, 1850, 80, 14], [240, 1950, 80, 14]],
    spikes: [[100, 608, 60, 12, 'd'], [0, 1720, 12, 300, 'r'], [348, 1720, 12, 300, 'l']],
    saws: [[190, 1250, 16, 0, 90, 3, 0]],
    signs: [[170, 'Su luz alumbra el camino'], [1000, 'Una roca rueda en el túnel'], [1640, 'Rocas que solo se ven de cerca']],
    cps: [0, 900, 1580], nest: { x: 180, y: 2280 }
  },
  {
    id: 'cavernas-2', scenario: 'cavernas', n: 2, name: 'Túneles', theme: 'cavernas', top: 2850, par: 280,
    walls: [[0, 250, 110, 400], [250, 250, 110, 400], [0, 750, 190, 350], [330, 750, 30, 350], [0, 1300, 30, 500], [170, 1300, 190, 500]],
    hidden: [[170, 450, 20, 20], [0, 2100, 200, 20], [160, 2300, 200, 20]],
    movers: [[40, 1450, 100, 14, 0, 70, 3, 0]],
    spikes: [[0, 2120, 200, 10, 'u'], [160, 2320, 200, 10, 'u']],
    saws: [[260, 930, 16, 0, 100, 3.2, 0]],
    signs: [[180, 'Hay una roca invisible'], [1240, 'Elevador de piedra'], [1960, 'Repisas ocultas con pinchos']],
    cps: [0, 1160, 1880], nest: { x: 180, y: 2650 }
  },
  {
    id: 'cavernas-3', scenario: 'cavernas', n: 3, name: 'Corazón de cristal', theme: 'cavernas', top: 3250, par: 340,
    walls: [[0, 300, 110, 400], [250, 300, 110, 400], [0, 1650, 125, 550], [235, 1650, 125, 550]],
    hidden: [[160, 1150, 40, 40], [0, 2550, 220, 20], [140, 2750, 220, 20]],
    movers: [[0, 1050, 120, 16, 100, 0, 3.5, 0], [240, 1250, 120, 16, -100, 0, 3.5, 0]],
    spikes: [[125, 1700, 8, 450, 'r'], [227, 1700, 8, 450, 'l']],
    saws: [[140, 450, 16, 0, 60, 2.6, 0], [220, 600, 16, 0, 60, 2.6, 0.5], [180, 2650, 18, 120, 0, 3, 0]],
    signs: [[230, 'Cristales giratorios'], [960, 'Plataformas en movimiento'], [1600, 'El pasadizo de espinas'], [2420, 'La cámara de cristal']],
    cps: [0, 850, 1550, 2350], nest: { x: 180, y: 3080 }
  },
  {
    id: 'volcan-1', scenario: 'volcan', n: 1, name: 'Ríos de lava', theme: 'volcan', mat: 'rock', top: 2350, par: 240,
    walls: [[0, 250, 90, 30], [270, 250, 90, 30], [0, 880, 60, 20], [300, 880, 60, 20], [0, 1500, 110, 450], [250, 1500, 110, 450]],
    lava: [[0, 280, 90, 14], [270, 280, 90, 14], [0, 900, 60, 14], [300, 900, 60, 14]],
    fireballs: [[45, 300, 250, 2.4, 0], [315, 300, 250, 2.4, 0.5], [30, 920, 260, 2.6, 0.2], [330, 920, 260, 2.6, 0.7], [180, 1560, 300, 3, 0]],
    crumbles: [[150, 600, 60, 14]],
    faders: [[0, 1050, 200, 20, 2.5, 2, 0], [160, 1250, 200, 20, 2.5, 2, 0.5]],
    signs: [[180, 'Bolas de fuego desde la lava'], [960, 'Rocas que aparecen y desaparecen'], [1450, 'La chimenea de fuego']],
    cps: [0, 780, 1380], nest: { x: 180, y: 2150 }
  },
  {
    id: 'volcan-2', scenario: 'volcan', n: 2, name: 'Suelos que se rompen', theme: 'volcan', mat: 'rock', top: 2700, par: 280,
    walls: [[0, 450, 110, 350], [250, 450, 110, 350], [0, 985, 70, 15], [290, 985, 70, 15], [0, 2000, 120, 300], [240, 2000, 120, 300]],
    crumbles: [[110, 600, 140, 16], [120, 2150, 120, 16]],
    faders: [[0, 1100, 220, 20, 3, 2, 0], [140, 1300, 220, 20, 3, 2, 0.5]],
    lava: [[0, 1000, 70, 12], [290, 1000, 70, 12]],
    fireballs: [[35, 1010, 300, 2.8, 0], [325, 1010, 300, 2.8, 0.4]],
    movers: [[40, 1850, 100, 16, 80, 0, 3, 0, 'rock']],
    signs: [[180, 'Toquen el piso con el huevo para romperlo'], [1500, 'Rápido: el piso vuelve a aparecer']],
    cps: [0, 880, 1600], nest: { x: 180, y: 2500 }
  },
  {
    id: 'volcan-3', scenario: 'volcan', n: 3, name: 'El cráter', theme: 'volcan', mat: 'rock', top: 3250, par: 360,
    walls: [[0, 1000, 110, 500], [250, 1000, 110, 500]],
    faders: [[0, 400, 180, 20, 2, 1.8, 0], [180, 400, 180, 20, 2, 1.8, 0.5], [0, 2600, 240, 20, 2.4, 1.6, 0]],
    lava: [[0, 250, 70, 10], [290, 250, 70, 10], [110, 1250, 6, 200], [244, 1250, 6, 200], [0, 1700, 60, 10], [300, 1700, 60, 10]],
    fireballs: [[180, 260, 400, 2.6, 0.25], [180, 2500, 450, 3, 0.3]],
    crumbles: [[110, 1200, 140, 16], [240, 2600, 120, 16]],
    movers: [[30, 1850, 100, 16, 90, 0, 2.8, 0, 'rock'], [230, 2050, 100, 16, -90, 0, 2.8, 0.5, 'rock']],
    saws: [[180, 1950, 16, 120, 0, 2.2, 0]],
    signs: [[180, 'Compuertas de roca'], [960, 'Rompan el piso y crucen'], [1650, 'Rocas flotando sobre lava'], [2450, 'El borde del cráter']],
    cps: [0, 880, 1580, 2380], nest: { x: 180, y: 3080 }
  },
  {
    id: 'cielo-1', scenario: 'cielo', n: 1, name: 'Islas flotantes', theme: 'cielo', mat: 'cloud', top: 2450, par: 220,
    walls: [[0, 350, 140, 30], [220, 550, 140, 30], [0, 750, 140, 30], [0, 1550, 120, 30], [0, 1900, 135, 30], [235, 1900, 125, 30]],
    movers: [[40, 1200, 110, 20, 80, 0, 3.5, 0, 'cloud'], [210, 1400, 110, 20, -80, 0, 3.5, 0, 'cloud']],
    winds: [[0, 900, 360, 200, 150, 0, 3, 0]],
    spikes: [[0, 1580, 120, 10, 'u'], [0, 1930, 135, 10, 'u'], [235, 1930, 125, 10, 'u']],
    signs: [[170, 'Las nubes rebotan'], [1080, 'Puentes de nube'], [1820, 'El paso estrecho']],
    cps: [0, 1080, 1700], nest: { x: 180, y: 2280 }
  },
  {
    id: 'cielo-2', scenario: 'cielo', n: 2, name: 'Puentes de viento', theme: 'cielo', mat: 'cloud', top: 2700, par: 280,
    walls: [[0, 1150, 120, 30], [240, 1250, 120, 30]],
    movers: [[140, 400, 80, 18, 0, 80, 3, 0, 'cloud'], [0, 1800, 120, 18, 100, 0, 3, 0, 'cloud'], [240, 2000, 120, 18, -100, 0, 3, 0.3, 'cloud'], [0, 2200, 120, 18, 100, 0, 3, 0.6, 'cloud']],
    winds: [[0, 500, 360, 300, -200, 0, 2.6, 0], [130, 1000, 100, 400, 0, 450, 3, 0]],
    spikes: [[0, 520, 12, 260, 'r'], [130, 1420, 100, 10, 'd']],
    saws: [[180, 1900, 16, 0, 60, 2.5, 0]],
    signs: [[180, 'Una nube sube y baja'], [960, 'Columna de aire: no se vayan arriba'], [1720, 'Puentes que van y vienen']],
    cps: [0, 880, 1600], nest: { x: 180, y: 2500 }
  },
  {
    id: 'cielo-3', scenario: 'cielo', n: 3, name: 'El último nido', theme: 'cielo', mat: 'cloud', top: 3450, par: 400,
    walls: [[0, 300, 120, 500], [240, 300, 120, 500], [0, 1850, 220, 24], [140, 2050, 220, 24], [0, 2600, 100, 500], [260, 2600, 100, 500]],
    movers: [[20, 1150, 100, 18, 0, 90, 3, 0, 'cloud'], [240, 1150, 100, 18, 0, 90, 3, 0.5, 'cloud'], [100, 2750, 60, 16, 40, 0, 2, 0, 'cloud'], [200, 2950, 60, 16, -40, 0, 2, 0.5, 'cloud']],
    winds: [[128, 400, 104, 300, 180, 0, 2, 0], [0, 1450, 360, 150, 0, -300, 2, 0], [0, 1900, 360, 140, 200, 0, 2.5, 0]],
    spikes: [[120, 350, 8, 400, 'r'], [232, 350, 8, 400, 'l'], [0, 1874, 220, 10, 'u'], [140, 2074, 220, 10, 'u']],
    saws: [[180, 1350, 18, 100, 0, 2.4, 0], [180, 3050, 16, 60, 0, 2, 0]],
    signs: [[200, 'El pasillo dorado'], [1000, 'Todo se mueve'], [1780, 'Zigzag en el viento'], [2520, 'La última subida']],
    cps: [0, 950, 1700, 2450], nest: { x: 180, y: 3280 }
  }
];
export const levelById = id => LEVELS.find(l => l.id === id);
export const levelsOf = sc => LEVELS.filter(l => l.scenario === sc);
