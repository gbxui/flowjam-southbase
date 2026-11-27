# FlowJam

Editor visual **estilo FigJam** para diagramas de flujo — con un **motor de IA multi-modelo** que edita el diagrama por ti.

![stack](https://img.shields.io/badge/Next.js%2016-React%2019-0F172A?label=%20&labelColor=0F172A) ![ai](https://img.shields.io/badge/Motor%20IA-GLM%20%C2%B7%20Gemini%20%C2%B7%20Groq-22D3EE?label=%20&labelColor=0F172A)

## Qué hace

- **Lienzo infinito estilo FigJam**: pan, zoom, cuadrícula de puntos, pinch táctil.
- **Flujo de ejemplo precargado** (fases 00 → 10): cold email automatizado, 5 canales de entrada que convergen en Cal.com, Discovery, propuesta con paquetes ancla, contrato 50/50, kick-off, producción, entrega, post-lanzamiento y recurrencia mensual.
- **Ciclo de feedback sin fricción** integrado en la fase 07: staging privado → comentarios sin cuenta (BugHerd/Pastel) → tareas automáticas en Notion Hub → respuesta en Loom → rombo de decisión «¿Aprobado?» con bucle de iteración.
- **Cada tarjeta es editable**: doble clic para escribir, arrastrar, redimensionar, cambiar color, etiquetas y fase; inspector lateral con formulario completo.
- **Caja de herramientas FigJam**: seleccionar, mano, tarjeta, rombo de decisión, nota adhesiva, texto y **conector** con flechas y etiquetas.
- **Historial completo**: deshacer/rehacer, duplicar, multiselección con marquesina, atajos de teclado (V, H, R, D, S, T, C, Supr, Ctrl+Z…).
- **Autoguardado** en el navegador (localStorage) + exportar/importar JSON.
- **Exportación vector**: SVG editable (se puede arrastrar a FigJam como vectores) y PNG 2x.

## Motor IA (escalable y gratis)

El panel «Motor IA» ve todo el diagrama en contexto y puede **crear, editar, conectar y mover tarjetas** cuando se lo pides en lenguaje natural («añade una etapa de upsell tras el lanzamiento y conéctala»).

Tres proveedores, todos con capa gratuita:

| Proveedor | Modelo recomendado | API key |
|---|---|---|
| Automático (integrado) | GLM en desarrollo · Gemini/Groq en producción | No necesita key |
| **Google Gemini** | `gemini-2.5-flash` | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **Groq** | `llama-3.3-70b-versatile` | [console.groq.com](https://console.groq.com/keys) |

Las keys se guardan **solo en tu navegador** y viajan directo al proveedor. El motor es plug-and-play: la ruta `/api/ai` abstrae los proveedores (todos OpenAI-compatible), así que añadir uno nuevo es añadir una URL al objeto `PROVIDERS`.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS 4 + shadcn/ui · Lucide icons · Zustand
- Motor IA en el backend (`/api/ai`) con proveedores intercambiables

## Desarrollo

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>.

## Estructura

```
src/
  app/
    api/ai/route.ts        # motor IA multi-proveedor (GLM · Gemini · Groq)
    layout.tsx · page.tsx
  components/flow/
    FlowEditor.tsx         # lienzo: pan/zoom, marquesina, pinch, atajos
    NodeView.tsx           # tarjeta editable (arrastrar, escribir, redimensionar)
    EdgesLayer.tsx         # conexiones SVG con flechas y etiquetas
    TopBar.tsx             # exportar/importar, historial, estado guardado
    Toolbox.tsx            # caja de herramientas estilo FigJam
    Inspector.tsx          # formulario de la tarjeta/conexión seleccionada
    AIPanel.tsx            # chat del motor IA + acciones rápidas
  lib/flow/
    store.ts               # estado Zustand + historial + ops de IA validadas
    defaults.ts            # flujo de ejemplo 00→10 + ciclo de feedback
    geometry.ts            # anclas y curvas de las conexiones
    svgExport.ts           # exportación SVG vectorial y PNG 2x
```

## Despliegue

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgbxui%2Fflowjam&project-name=flowjam&repository-name=flowjam)

O desde el dashboard: **vercel.com/new** → *Import Git Repository* → `flowjam` → **Deploy**. Detecta Next.js solo.

Funciona **sin variables de entorno** — cada usuario pega su key gratuita en ⚙️ dentro del panel «Motor IA» (se guarda solo en su navegador). Opcionalmente, define estas variables en Vercel para que el motor funcione sin configurar nada para nadie:

| Variable | Qué hace |
|---|---|
| `GEMINI_API_KEY` | El motor «Automático» y la opción Gemini la usan en el servidor |
| `GROQ_API_KEY` | Respaldo del «Automático» y opción Groq en el servidor |

---

Hecho con rigor por Southbase Studio · Caracas → 🇺🇸
