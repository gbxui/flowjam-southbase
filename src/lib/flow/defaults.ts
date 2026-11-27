import type { FlowNode, FlowEdge } from "./types";

const n = (
  id: string,
  type: FlowNode["type"],
  color: FlowNode["color"],
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  body?: string,
  tags?: string[],
  phase?: number | null,
  icon?: string
): FlowNode => ({
  id,
  type,
  color,
  x,
  y,
  w,
  h,
  title,
  body,
  tags,
  phase: phase ?? null,
  icon,
});

const e = (id: string, from: string, to: string, label?: string, dashed?: boolean): FlowEdge => ({
  id,
  from,
  to,
  label,
  dashed,
});

/** Full demo client flow: 10 phases + 5 channels + frictionless feedback loop */
export function defaultFlow(): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [
    // ── Title markers ────────────────────────────────────────────────
    n("t1", "text", "slate", 60, 90, 620, 50, "FLOWJAM · Flujo de cliente 00 → 10"),
    n("t2", "text", "cyan", 2470, 668, 470, 40, "CICLO DE FEEDBACK SIN FRICCIÓN"),

    // ── Phase 00 : automated cold email ──────────────────────────────
    n("n0", "card", "violet", 40, 400, 230, 170,
      "Cold email automatizado",
      "Secuencias con Instantly y dominios calientes. 8 plantillas EN para el mercado USA, seguimiento automático y respuestas dirigidas a Cal.com.",
      ["Instantly", "8 plantillas EN", "Dominios calientes"], 0, "Mail"),

    // ── Phase 01 : 5 entry channels converging in Cal.com ────────────
    n("c1", "card", "emerald", 350, 150, 210, 84, "Referidos", "Clientes y red presentan prospectos.", ["Warm intro"], 1, "Users"),
    n("c2", "card", "violet", 350, 252, 210, 84, "Instagram / TikTok", "Contenido y DMs cualificados.", ["Orgánico"], 1, "Camera"),
    n("c3", "card", "cyan", 350, 354, 210, 84, "Google / SEO local", "Buscan agencia web en inglés.", ["SEO"], 1, "Search"),
    n("c4", "card", "amber", 350, 456, 210, 84, "Upwork / marketplaces", "Proyectos con budget claro.", ["Marketplace"], 1, "Briefcase"),
    n("c5", "card", "rose", 350, 558, 210, 84, "Respuestas del cold email", "Replies que piden agendar.", ["Instantly"], 1, "Reply"),
    n("n1", "card", "cyan", 700, 400, 230, 170,
      "Cal.com · cita agendada",
      "El lead elige horario y completa el intake Discovery (proyecto, presupuesto, referencias y logística) antes de la llamada.",
      ["Cal.com", "Formulario intake"], 1, "CalendarClock"),

    // ── Phase 02–06 : spine ──────────────────────────────────────────
    n("n2", "card", "cyan", 1020, 400, 230, 170,
      "Pre-venta preparada",
      "Fireflies transcribe reuniones previas (si las hay) y Notion Hub se prepara con plantillas de propuesta y checklist técnico.",
      ["Fireflies", "Notion Hub"], 2, "FileSearch"),
    n("n3", "card", "cyan", 1340, 400, 230, 170,
      "Meet 1 · Discovery",
      "Video-llamada de 45 min con guion estructurado. Dolor, objetivos, presupuesto y timeline. En español, tono consultivo.",
      ["Google Meet", "45 min", "Guion"], 3, "Search"),
    n("n4", "card", "cyan", 1660, 400, 230, 190,
      "Propuesta + Project Scope",
      "En 24–48 h: propuesta con 3 paquetes ancla. Enhanced $1,000 · Immersive $5,999 · Full Immersive $9,999 · E-commerce $6,500. Scope por escrito con exclusiones, hitos y 50/50.",
      ["24–48 h", "Paquetes ancla", "Scope firmado"], 4, "FileText"),
    n("d0", "decision", "amber", 1935, 165, 190, 140, "¿Acepta?"),
    n("n12", "card", "rose", 1420, 155, 220, 120,
      "Nurture · seguimiento",
      "No cierra ahora: secuencia de valor en 30 días + caso de éxito. Luego vuelve al pool de cold email.",
      ["30 días"], null, "RefreshCw"),
    n("n5", "card", "cyan", 1980, 400, 230, 170,
      "Contrato + 50% inicial",
      "Contrato simple de 2 páginas. Pago inicial del 50% por Stripe, Wise o Zelle. Sin kick-off sin pago confirmado.",
      ["Stripe", "Wise", "Zelle"], 5, "FileSignature"),
    n("n6", "card", "cyan", 2300, 400, 230, 170,
      "Meet 2 · Kick-off",
      "Solo tras confirmar el pago. Se comparte Notion Hub del proyecto: timeline, canales, expectativas y accesos.",
      ["Notion Hub", "60 min"], 6, "Rocket"),
    n("n7", "card", "cyan", 2620, 400, 230, 180,
      "Producción · sprint",
      "Diseño y desarrollo por hitos. Cada avance se publica en staging. Comunicación async por Loom y un solo hilo (Slack/WhatsApp).",
      ["Staging", "Loom", "Async"], 7, "Hammer"),

    // ── Feedback loop (the new system) ───────────────────────────────
    n("f0", "card", "emerald", 2420, 760, 240, 170,
      "Staging privado",
      "Cada avance se publica en un link privado con contraseña (preview de Vercel). El cliente abre su web real desde cualquier dispositivo.",
      ["Vercel Preview", "Link privado"], 7, "Globe"),
    n("f1", "card", "emerald", 2730, 760, 250, 190,
      "Feedback sin cuenta",
      "BugHerd o Pastel: el cliente hace clic en cualquier elemento de la página y deja su comentario directo — sin crear cuenta, sin instalar nada.",
      ["BugHerd", "Pastel", "Sin registro"], 7, "MessageSquareDot"),
    n("f2", "card", "emerald", 3060, 760, 240, 170,
      "Comentarios → tareas",
      "Cada comentario entra solo como tarea en Notion Hub, con screenshot, URL, navegador y quién lo escribió. Nada se pierde.",
      ["Notion Hub", "Automático"], 7, "ListChecks"),
    n("f3", "card", "emerald", 3060, 960, 240, 170,
      "Respuesta en Loom",
      "El estudio resuelve y responde con video asíncrono de 1–3 min mostrando el fix. Cero reuniones extra.",
      ["Loom", "1–3 min"], 7, "Video"),
    n("fd", "decision", "amber", 3380, 760, 190, 150, "¿Aprobado?"),

    // ── Phase 08–10 ──────────────────────────────────────────────────
    n("n8", "card", "cyan", 2940, 400, 230, 170,
      "Meet 3 · Entrega",
      "Presentación de resultados y walk-through en vivo del sitio. Feedback final consolidado desde el ciclo de staging.",
      ["Google Meet", "Walk-through"], 8, "Presentation"),
    n("n9", "card", "cyan", 3260, 400, 230, 170,
      "50% final + entrega",
      "Pago restante del 50%. Migración a hosting del cliente, dominio, accesos y entrenamiento en video (Loom).",
      ["Migración", "Handover"], 9, "CreditCard"),
    n("n10", "card", "violet", 3580, 400, 250, 200,
      "Post-lanzamiento · recurrencia",
      "Care Plan $500 · AI Agent $650 · Bolsa de Horas $700 · SEO $1,500 · Pauta $1,500 · Growth Partner $2,500 /mes.",
      ["Mensual", "LTV", "Upsell"], 10, "TrendingUp"),

    // ── Onboarding stickies ─────────────────────────────────────────
    n("s1", "sticky", "amber", 60, 640, 220, 180, "",
      "Cómo usar: arrastra las tarjetas, doble clic para editar el texto, selecciona y pulsa Supr para borrar. C = conector. Todo se guarda solo."),
    n("s2", "sticky", "amber", 60, 860, 220, 180, "",
      "Motor IA: pide «añade una etapa de upsell tras el lanzamiento» y editará el diagrama por ti. Gemini y Groq son gratis: configúralos en ⚙️."),
  ];

  const edges: FlowEdge[] = [
    e("e0", "n0", "n1", "respuesta"),
    e("e1", "c1", "n1"), e("e2", "c2", "n1"), e("e3", "c3", "n1"),
    e("e4", "c4", "n1"), e("e5", "c5", "n1"),
    e("e6", "n1", "n2"), e("e7", "n2", "n3"), e("e8", "n3", "n4"),
    e("e9", "n4", "d0", "propuesta"),
    e("e10", "d0", "n5", "sí"),
    e("e11", "d0", "n12", "no"),
    e("e12", "n12", "n0", "30 días", true),
    e("e13", "n5", "n6"), e("e14", "n6", "n7"),
    e("e15", "n7", "f0", "cada avance"),
    e("e16", "f0", "f1", "abre la web"),
    e("e17", "f1", "f2", "clic + comentario"),
    e("e18", "f2", "f3"),
    e("e19", "f3", "fd"),
    e("e20", "fd", "n8", "sí"),
    e("e21", "fd", "f0", "no · iterar", true),
    e("e22", "n8", "n9"), e("e23", "n9", "n10"),
  ];

  return { nodes, edges };
}
