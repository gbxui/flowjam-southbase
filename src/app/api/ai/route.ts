import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Msg {
  role: "system" | "user" | "assistant";
  content: string;
}

const PROVIDERS = {
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    label: "Gemini",
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    label: "Groq",
  },
} as const;

function labelByUrl(url: string): string {
  if (url.includes("googleapis")) return "Gemini";
  if (url.includes("groq")) return "Groq";
  return "El proveedor";
}

async function callOpenAICompatible(
  url: string,
  apiKey: string,
  model: string,
  messages: Msg[]
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 2400 }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = data?.error?.message ?? `HTTP ${res.status}`;
      return `__ERROR__${labelByUrl(url)} respondió un error: ${detail}`;
    }
    return (
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.delta?.content ??
      ""
    );
  } catch (err) {
    const msg =
      err instanceof Error && err.name === "AbortError"
        ? "la respuesta tardó demasiado (timeout)"
        : "no se pudo conectar";
    return `__ERROR__${msg}`;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  let body: {
    provider?: string;
    model?: string;
    apiKey?: string;
    system?: string;
    messages?: Msg[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { provider = "builtin", apiKey, system, messages = [] } = body;
  if (!system || !Array.isArray(messages) || !messages.length) {
    return NextResponse.json({ error: "Faltan system o messages" }, { status: 400 });
  }
  const full: Msg[] = [{ role: "system", content: system }, ...messages.slice(-16)];

  const missingKey = (label: string) =>
    NextResponse.json(
      {
        error: `Falta la API key de ${label}. Pégala en ⚙️ Ajustes del panel IA o define GEMINI_API_KEY / GROQ_API_KEY como variables de entorno del servidor.`,
        needsKey: true,
      },
      { status: 400 }
    );

  // ── free cloud providers (browser key or server env key) ─────
  if (provider === "gemini" || provider === "groq") {
    const p = provider as "gemini" | "groq";
    const envKey = (p === "gemini" ? process.env.GEMINI_API_KEY : process.env.GROQ_API_KEY) ?? "";
    const key = (apiKey ?? "").trim() || envKey.trim();
    if (!key) {
      return missingKey(PROVIDERS[p].label);
    }
    const model =
      provider === "gemini"
        ? body.model || "gemini-2.5-flash"
        : body.model || "llama-3.3-70b-versatile";
    const content = await callOpenAICompatible(
      PROVIDERS[provider].url,
      key,
      model,
      full
    );
    if (content.startsWith("__ERROR__")) {
      return NextResponse.json({ error: content.slice(9) }, { status: 502 });
    }
    return NextResponse.json({ content });
  }

  // ── "builtin": server env keys first (production), sandbox engine after ─
  const envGemini = (process.env.GEMINI_API_KEY ?? "").trim();
  const envGroq = (process.env.GROQ_API_KEY ?? "").trim();
  if (envGemini || envGroq) {
    const prov = envGemini ? "gemini" : "groq";
    const model = envGemini ? "gemini-2.5-flash" : "llama-3.3-70b-versatile";
    const content = await callOpenAICompatible(
      PROVIDERS[prov].url,
      envGemini || envGroq,
      model,
      full
    );
    if (content.startsWith("__ERROR__")) {
      return NextResponse.json({ error: content.slice(9) }, { status: 502 });
    }
    return NextResponse.json({ content });
  }

  // ── sandbox engine (zero config where this app is sandboxed) ─
  try {
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: full,
      stream: false,
      thinking: { type: "disabled" },
    });
    const content =
      (completion as { choices?: { message?: { content?: string } }[] })?.choices?.[0]
        ?.message?.content ?? "";
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json(
      {
        error:
          "El motor integrado no está configurado en este entorno. Usa Gemini o Groq (gratis) en ⚙️ Ajustes del panel IA.",
        needsKey: true,
      },
      { status: 503 }
    );
  }
}
