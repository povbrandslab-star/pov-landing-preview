# POV · Vidrio acanalado (Cell) — recurso web

Fondo de **v2 · Start here · 04** ("For brands that are growing.").
En el sistema de POV, el vidrio acanalado significa **claridad**. En movimiento le corresponde un *rack focus*: pasa de desenfocado a nítido.

La imagen no es una foto. Es un **shader WebGL** que recalcula el acanalado, la refracción, las manchas de luz y el grano en vivo, así que se ve nítido a cualquier tamaño y se puede animar. No tiene dependencias y pesa unos 10 KB.

## Archivos

| Archivo | Para qué |
|---|---|
| `pov-vidrio.js` | Módulo ES. Exporta `createVidrio()` y registra el web component `<pov-vidrio>` |
| `vidrio-cell-2560x1440.(jpg\|webp)` | Póster horizontal (hero de escritorio) y respaldo si no hay WebGL |
| `vidrio-cell-1440x2560.(jpg\|webp)` | Póster vertical (móvil) |
| `vidrio-cell-1080x1920.(jpg\|webp)` | Formato story |
| `original-story-s04-vidrio-cell.jpg` | La imagen exacta usada en la story, como referencia |
| `demo.html` | Demo funcionando (sírvela con cualquier servidor local) |

## Uso

### HTML / Astro / cualquier sitio

```html
<script type="module" src="/pov-vidrio/pov-vidrio.js"></script>
<pov-vidrio poster="/pov-vidrio/vidrio-cell-2560x1440.webp" interactive style="height:100vh"></pov-vidrio>
```

Atributos disponibles:

- `poster`: imagen de respaldo.
- `interactive`: la mancha sigue el puntero con suavidad.
- `static`: sin animación.
- `grain="0.022"`: intensidad del grano.
- `reed="0.0714"`: ancho del acanalado.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';

export default function VidrioBg({ interactive = true, className }) {
  const ref = useRef(null);
  useEffect(() => {
    let v;
    import('@/lib/pov-vidrio').then(({ createVidrio }) => {
      v = createVidrio(ref.current, { interactive });
    });
    return () => v?.destroy();
  }, [interactive]);
  return (
    <div className={className} style={{ position: 'relative', backgroundImage: 'url(/pov-vidrio/vidrio-cell-2560x1440.webp)', backgroundSize: 'cover' }}>
      <canvas ref={ref} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
}
```

## Opciones de `createVidrio(canvas, opciones)`

| Opción | Por defecto | Efecto |
|---|---|---|
| `reed` | `0.0714` | Ancho del acanalado (× el lado menor del lienzo) |
| `refraction` | `1.6` | Desplazamiento de cada acanalado |
| `blob` / `blobSize` | `[0.58,0.42]` / `[0.30,0.46]` | Posición y tamaño de la mancha principal |
| `blob2` / `blob2Size` | `[0.25,0.78]` / `[0.18,0.178]` | Mancha secundaria |
| `softness` | `0.016` | Foco: más alto es más desenfocado |
| `colors` | Ink `#191918`, Cell `#8EB0C7`, Cream `#E0DED5` | Rampa de color de la marca |
| `grain` / `grainFps` | `0.022` / `12` | Grano sutil POV, renovado a 12 fps |
| `animate` | `true` | Activa el movimiento |
| `drift` / `driftPeriod` | `0.035` / `38` s | Deriva lenta de las manchas |
| `slide` | `0.006` | El vidrio se desliza despacio en horizontal |
| `focusIntro` / `focusFrom` | `1.8` s / `6` | *Rack focus* de entrada |
| `interactive` / `follow` | `false` / `0.12` | Seguimiento del puntero |
| `maxDpr` | `1.5` | Tope de resolución, por rendimiento |

Métodos disponibles: `start()`, `stop()`, `setOptions({...})`, `renderFrame(ms)` y `destroy()`.

## Reglas de marca para el movimiento

- **Lento y silencioso.** Nada rebota ni gira. Si el movimiento se nota antes que el texto, es demasiado.
- La entrada es el *rack focus* de 1.8 s. No hay otros efectos de entrada.
- Si se usa el rojo, solo como luz o como una línea, nunca de fondo. Este recurso va en Cell, Ink y Cream.
- Con `prefers-reduced-motion` se dibuja un solo cuadro estático, sin animación.
- La animación se pausa sola cuando el fondo sale de pantalla o la pestaña está oculta.
