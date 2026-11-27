"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  Cog,
  CornerDownLeft,
  ExternalLink,
  Loader2,
  Send,
  Sparkles,
  User,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFlow } from "@/lib/flow/store";
import { toast } from "sonner";

const SETTINGS_KEY = "sbs-ai-settings";

interface AISettings {
  geminiKey: string;
  groqKey: string;
  model: string; // "builtin:default" | "gemini:gemini-2.5-flash" | "groq:llama-3.3-70b-versatile"
}

const DEFAULT_SETTINGS: AISettings = {
  geminiKey: "",
  groqKey: "",
  model: "builtin:default",
};

const MODEL_OPTIONS = [
  { group: "Automático (integrado)", items: [{ value: "builtin:default", label: "Automático · sin configuración" }] },
  {
    group: "Gemini (gratis · aistudio.google.com)",
    items: [
      { value: "gemini:gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "gemini:gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
      { value: "gemini:gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    ],
  },
  {
    group: "Groq (gratis · console.groq.com)",
    items: [
      { value: "groq:llama-3.3-70b-versatile", label: "Llama 3.3 70B (versatile)" },
      { value: "groq:llama-3.1-8b-instant", label: "Llama 3.1 8B (instant)" },
      { value: "groq:openai/gpt-oss-120b", label: "GPT-OSS 120B" },
    ],
  },
];

const SYSTEM_PROMPT = `Eres Flow AI, el motor de inteligencia de "FlowJam", un editor visual de flujos estilo FigJam. Ayudas a diseñar, expandir y mejorar flujos comerciales completos: captación, cualificación, propuestas, entrega y recurrencia.

REGLAS:
1. Responde SIEMPRE en español, breve y accionable.
2. Cuando el usuario pida crear, modificar, mover o borrar elementos del diagrama, incluye al final de tu respuesta un bloque:

\`\`\`flow-ops
{"ops": [ ... ]}
\`\`\`

Operaciones disponibles (solo estas):
- {"op":"add_node","node":{"type":"card|decision|sticky|text","title":"...","body":"...","tags":["..."],"x":1400,"y":600,"color":"cyan|amber|emerald|violet|rose|slate","phase":7}}
- {"op":"add_sticky","text":"...","x":1400,"y":760}
- {"op":"update_node","id":"ID_EXISTENTE","patch":{"title":"...","body":"...","tags":["..."],"color":"...","phase":null}}
- {"op":"delete_node","id":"ID_EXISTENTE"}
- {"op":"add_edge","from":"ID","to":"ID","label":"sí|no|cada avance|...","dashed":false}
- {"op":"move_node","id":"ID_EXISTENTE","x":2600,"y":420}

3. Usa SOLO ids existentes del CONTEXTO para update, delete, move y edges. Los nodos nuevos NO llevan id.
4. Coloca los nodos nuevos al lado de lo relacionado, sin tapar nodos existentes (guiate por las posiciones del contexto).
5. Si la petición es solo una pregunta u opinión, responde SIN bloque flow-ops.`;

function diagramContext(): string {
  const { nodes, edges, selection } = useFlow.getState();
  const lines: string[] = [
    "=== DIAGRAMA ACTUAL ===",
    "NODOS (id · tipo · fase · título · posición x,y · tamaño):",
  ];
  for (const n of nodes) {
    const body = n.body ? ` · texto: "${n.body.slice(0, 90)}${n.body.length > 90 ? "…" : ""}"` : "";
    lines.push(
      `[${n.id}] ${n.type} · fase ${n.phase ?? "—"} · «${n.title || "(nota adhesiva)"}» · (${n.x},${n.y}) · ${n.w}x${n.h}${body}`
    );
  }
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n.title || "(nota)"]));
  lines.push("ARISTAS:");
  for (const e of edges) {
    lines.push(`${e.from}→${e.to} (${byId[e.from]} → ${byId[e.to]}${e.label ? `, etiqueta "${e.label}"` : ""})`);
  }
  if (selection.nodes.length) {
    lines.push(
      `SELECCIÓN ACTUAL: ${selection.nodes.map((id) => `${id} «${byId[id]}»`).join(" · ")}`
    );
  }
  return lines.join("\n");
}

function extractOps(content: string): { clean: string; ops: unknown[] } {
  const ops: unknown[] = [];
  let clean = content;
  const re = /```(?:flow-ops|json)\s*\n?([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    try {
      const parsed = JSON.parse(m[1]);
      if (Array.isArray(parsed?.ops)) {
        ops.push(...parsed.ops);
        clean = clean.replace(m[0], "");
      }
    } catch {
      /* not an ops block — ignore */
    }
  }
  return { clean: clean.trim(), ops };
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  applied?: number;
  error?: boolean;
}

export function AIPanel() {
  const open = useFlow((s) => s.aiPanelOpen);
  const selection = useFlow((s) => s.selection);
  const nodes = useFlow((s) => s.nodes);

  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Soy el **motor IA** del lienzo. Puedo analizar el flujo, proponer mejoras y **editar el diagrama por ti**: pídeme cosas como «añade una etapa de upsell tras el post-lanzamiento» o «conecta el staging con la entrega».",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as AISettings) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, loading]);

  if (!open) return null;

  const saveSettings = (s: AISettings) => {
    setSettings(s);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  };

  const [provider, model] = settings.model.split(":");

  const send = async (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text || loading) return;
    const prov = settings.model.split(":")[0];
    const key =
      prov === "gemini" ? settings.geminiKey : prov === "groq" ? settings.groqKey : "";
    // no bloqueamos aquí: el servidor puede tener claves de entorno configuradas
    const nextChat: ChatMsg[] = [...chat, { role: "user", content: text }];
    setChat(nextChat);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: prov,
          model: settings.model.split(":")[1] || undefined,
          apiKey: key || undefined,
          system: `${SYSTEM_PROMPT}\n\n${diagramContext()}`,
          messages: nextChat.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as {
        content?: string;
        error?: string;
        needsKey?: boolean;
      };
      if (!res.ok || !data.content) {
        setChat([
          ...nextChat,
          {
            role: "assistant",
            content: `**No pude responder:** ${data.error ?? "error desconocido"}`,
            error: true,
          },
        ]);
        toast.error(data.error ?? "Error del motor IA");
        if (data.needsKey) setSettingsOpen(true);
        return;
      }
      const { clean, ops } = extractOps(data.content);
      let applied = 0;
      if (ops.length) {
        const r = useFlow.getState().applyOps(ops);
        applied = r.applied;
      }
      setChat([
        ...nextChat,
        { role: "assistant", content: clean || "Listo.", applied: applied || undefined },
      ]);
      if (applied > 0) {
        toast.success(`${applied} cambio${applied > 1 ? "s" : ""} aplicado${applied > 1 ? "s" : ""} al lienzo`, {
          description: "Ctrl+Z para deshacer · Ctrl+Shift+Z para rehacer",
        });
      }
    } catch {
      setChat([
        ...nextChat,
        { role: "assistant", content: "**Error de red.** Reintentar en unos segundos.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const selectedNode = selection.nodes.length === 1
    ? nodes.find((n) => n.id === selection.nodes[0])
    : undefined;

  const QUICK = [
    {
      label: "Analizar flujo",
      prompt:
        "Analiza este flujo comercial de punta a punta. Identifica cuellos de botella, pasos faltantes, riesgos de fuga de clientes y mejoras de conversión. Sé específico y menciona nodos por su título. Termina con tus 3 mejoras priorizadas.",
    },
    {
      label: "Proponer mejoras",
      prompt:
        "Propón y aplica mejoras concretas a este flujo (añade tarjetas o notas con tus recomendaciones, o edita textos existentes). Empieza con un resumen de 3 líneas de lo que cambiarás y por qué.",
    },
    {
      label: "Expandir nodo",
      prompt: selectedNode
        ? `Expande el nodo seleccionado «${selectedNode.title}» (${selectedNode.id}) en un subflujo detallado de 4 a 6 tarjetas conectadas entre sí, colocado debajo del nodo sin tapar nada existente, y conéctalo con una arista desde el nodo original.`
        : null,
    },
    {
      label: "Explicar flujo",
      prompt:
        "Explícame este flujo en 6-8 viñetas en orden cronológico, como se lo presentaría a un nuevo cliente. Nada de bloque flow-ops.",
    },
  ];

  return (
    <>
      <aside className="absolute top-16 right-3 bottom-3 z-40 flex w-[380px] max-w-[calc(100vw-24px)] flex-col rounded-2xl border border-[#16223A] bg-[#0B1322]/97 shadow-2xl backdrop-blur">
        {/* header */}
        <div className="flex items-center gap-2 border-b border-[#16223A] px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500">
            <Sparkles size={15} className="text-[#06202A]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] leading-4 font-semibold text-slate-100">Motor IA</div>
            <div className="text-[10.5px] text-slate-500">
              {provider === "builtin"
                ? "Automático · sin API key"
                : `${provider === "gemini" ? "Gemini" : "Groq"} · modelo gratuito`}
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Ajustes del motor IA"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <Cog size={16} />
          </button>
          <button
            onClick={() => useFlow.getState().toggleAIPanel(false)}
            aria-label="Cerrar panel IA"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* model selector */}
        <div className="border-b border-[#16223A] px-4 py-3">
          <Select
            value={settings.model}
            onValueChange={(v) => saveSettings({ ...settings, model: v })}
          >
            <SelectTrigger className="h-9 w-full border-[#243550] bg-[#0F172A] text-[12.5px] text-slate-200">
              <SelectValue placeholder="Modelo" />
            </SelectTrigger>
            <SelectContent className="border-[#243550] bg-[#0B1322] text-slate-200">
              {MODEL_OPTIONS.map((g) => (
                <div key={g.group}>
                  <div className="px-2 pt-2 pb-1 text-[10px] tracking-wider text-slate-500 uppercase">
                    {g.group}
                  </div>
                  {g.items.map((it) => (
                    <SelectItem
                      key={it.value}
                      value={it.value}
                      className="text-[12.5px] focus:bg-[#1E293B]"
                    >
                      {it.label}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          {(provider === "gemini" && !settings.geminiKey) ||
          (provider === "groq" && !settings.groqKey) ? (
            <button
              onClick={() => setSettingsOpen(true)}
              className="mt-2 w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300 transition hover:bg-amber-500/15"
            >
              Falta la API key (gratis) · pégala en Ajustes
            </button>
          ) : null}
        </div>

        {/* quick actions */}
        <div className="grid grid-cols-2 gap-1.5 border-b border-[#16223A] px-4 py-3">
          {QUICK.map((q) => (
            <button
              key={q.label}
              disabled={!q.prompt || loading}
              onClick={() => send(q.prompt!)}
              className="rounded-xl border border-[#243550] bg-[#0F172A] px-2.5 py-2 text-[11.5px] font-medium text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* chat */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3.5">
          {chat.map((m, i) => (
            <div
              key={i}
              className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                    m.error ? "bg-rose-500/15 text-rose-300" : "bg-[#1E293B] text-cyan-300"
                  }`}
                >
                  <Bot size={13} />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-md bg-cyan-500/15 text-cyan-50"
                    : m.error
                      ? "rounded-bl-md border border-rose-500/25 bg-rose-500/10 text-rose-200"
                      : "rounded-bl-md border border-[#1E293B] bg-[#0F172A] text-slate-300"
                }`}
              >
                <div className="[&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_li]:mb-0.5 [&_strong]:text-slate-100 [&_code]:rounded [&_code]:bg-[#1E293B] [&_code]:px-1 [&_code]:text-[11px] [&_code]:text-cyan-300">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
                {m.applied ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10.5px] font-medium text-emerald-300">
                    <Wand2 size={11} />
                    {m.applied} cambio{m.applied > 1 ? "s" : ""} aplicado
                    {m.applied > 1 ? "s" : ""} al lienzo
                  </div>
                ) : null}
              </div>
              {m.role === "user" && (
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#1E293B] text-slate-400">
                  <User size={13} />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-[#1E293B] text-cyan-300">
                <Bot size={13} />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-[#1E293B] bg-[#0F172A] px-3.5 py-2.5 text-[12px] text-slate-400">
                <Loader2 size={13} className="animate-spin text-cyan-400" />
                Pensando sobre el flujo…
              </div>
            </div>
          )}
        </div>

        {/* input */}
        <div className="border-t border-[#16223A] p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-[#243550] bg-[#0F172A] px-3 py-2 focus-within:border-cyan-400/50">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Pide un cambio: «añade upsell tras el lanzamiento»…"
              className="max-h-28 min-h-[24px] flex-1 resize-none bg-transparent text-[12.5px] text-slate-200 outline-none placeholder:text-slate-600"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-400 text-[#06202A] transition hover:bg-cyan-300 disabled:opacity-30"
            >
              <Send size={14} />
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-1 px-1 text-[10px] text-slate-600">
            <CornerDownLeft size={10} /> Enviar · Shift+Enter salto de línea · El IA ve todo el
            diagrama en contexto
          </div>
        </div>
      </aside>

      {/* settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-[420px] border-[#243550] bg-[#0B1322] text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Ajustes del motor IA</DialogTitle>
            <DialogDescription className="text-[12px] text-slate-500">
              Las keys se guardan solo en tu navegador (localStorage) y se envían únicamente al
              proveedor elegido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label className="text-[11.5px] text-slate-400">
                Gemini API key (gratis)
              </Label>
              <Input
                type="password"
                value={settings.geminiKey}
                onChange={(e) =>
                  saveSettings({ ...settings, geminiKey: e.target.value })
                }
                placeholder="AIza…"
                className="mt-1.5 h-9 border-[#243550] bg-[#0F172A] text-[12.5px]"
              />
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-cyan-400 hover:underline"
              >
                aistudio.google.com <ExternalLink size={9} />
              </a>
            </div>
            <div>
              <Label className="text-[11.5px] text-slate-400">Groq API key (gratis)</Label>
              <Input
                type="password"
                value={settings.groqKey}
                onChange={(e) => saveSettings({ ...settings, groqKey: e.target.value })}
                placeholder="gsk_…"
                className="mt-1.5 h-9 border-[#243550] bg-[#0F172A] text-[12.5px]"
              />
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-cyan-400 hover:underline"
              >
                console.groq.com <ExternalLink size={9} />
              </a>
            </div>
            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-3 text-[11.5px] leading-relaxed text-slate-500">
              El modo <span className="text-slate-300">Automático</span> funciona sin configurar
              nada. En producción, el servidor usa <code className="rounded bg-[#1E293B] px-1 text-cyan-300">GEMINI_API_KEY</code> o{' '}
              <code className="rounded bg-[#1E293B] px-1 text-cyan-300">GROQ_API_KEY</code> si están
              definidas como variables de entorno; y en su defecto, las keys que pegues aquí
              (solo en tu navegador). Gemini y Groq tienen capa gratuita.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
