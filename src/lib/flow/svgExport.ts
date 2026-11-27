import { edgeGeometry } from "./geometry";
import type { FlowEdge, FlowNode, NodeColor } from "./types";
import { COLORS } from "./types";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length <= maxChars) {
      cur = (cur + " " + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    const total = words.join(" ");
    const consumed = lines.join(" ").length;
    if (total.length > consumed) lines[maxLines - 1] = last.slice(0, Math.max(0, last.length - 1)) + "…";
  }
  return lines.filter(Boolean);
}

/** Build a standalone, editable vector SVG of the diagram (drops into FigJam). */
export function buildSVG(nodes: FlowNode[], edges: FlowEdge[]): string {
  if (!nodes.length) return "";
  const pad = 70;
  const minX = Math.min(...nodes.map((n) => n.x)) - pad;
  const minY = Math.min(...nodes.map((n) => n.y)) - pad;
  const maxX = Math.max(...nodes.map((n) => n.x + n.w)) + pad;
  const maxY = Math.max(...nodes.map((n) => n.y + n.h)) + pad;
  const W = maxX - minX;
  const H = maxY - minY;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parts: string[] = [];

  parts.push(
    `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 z" fill="#64748B"/></marker></defs>`
  );

  for (const e of edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    const g = edgeGeometry(a, b);
    parts.push(
      `<path d="${g.path}" fill="none" stroke="#64748B" stroke-width="1.75"${e.dashed ? ' stroke-dasharray="7 6"' : ""} marker-end="url(#ar)"/>`
    );
    if (e.label) {
      const tx = g.mid.x;
      const ty = g.mid.y - 8;
      const wch = e.label.length * 5.7 + 14;
      parts.push(
        `<rect x="${tx - wch / 2}" y="${ty - 9}" width="${wch}" height="17" rx="8" fill="#0F172A" stroke="#334155"/>` +
          `<text x="${tx}" y="${ty + 4}" font-size="10" text-anchor="middle" fill="#9CA3AF" font-family="system-ui, sans-serif">${esc(e.label)}</text>`
      );
    }
  }

  for (const n of nodes) {
    const accent = (COLORS[n.color as NodeColor] ?? COLORS.slate).accent;
    if (n.type === "card") {
      parts.push(
        `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="14" fill="#1E293B" stroke="#334155" stroke-width="1.25"/>` +
          `<rect x="${n.x}" y="${n.y + 16}" width="4" height="${n.h - 32}" rx="2" fill="${accent}"/>`
      );
      let tx = n.x + 18;
      if (n.phase !== null && n.phase !== undefined) {
        const label = String(n.phase).padStart(2, "0");
        parts.push(
          `<rect x="${tx}" y="${n.y + 13}" width="30" height="17" rx="5" fill="#0F172A" stroke="${accent}" stroke-opacity="0.45"/>` +
            `<text x="${tx + 15}" y="${n.y + 25}" font-size="10" text-anchor="middle" fill="${accent}" font-family="ui-monospace, monospace">${label}</text>`
        );
        tx += 38;
      }
      let titleLines = wrap(n.title, Math.round((n.w - (tx - n.x) - 16) / 7.3), 2);
      titleLines.forEach((l, i) =>
        parts.push(
          `<text x="${tx}" y="${n.y + 32 + i * 16 + (titleLines.length === 1 ? 2 : 0)}" font-size="13.5" font-weight="600" fill="#F1F5F9" font-family="system-ui, sans-serif">${esc(l)}</text>`
        )
      );
      const bodyLines = wrap(n.body ?? "", Math.round((n.w - 36) / 6.0), 5);
      bodyLines.forEach((l, i) =>
        parts.push(
          `<text x="${n.x + 18}" y="${n.y + (titleLines.length > 1 ? 70 : 54) + i * 15}" font-size="11" fill="#94A3B8" font-family="system-ui, sans-serif">${esc(l)}</text>`
        )
      );
      let cx = n.x + 18;
      const cy = n.y + n.h - 16;
      (n.tags ?? []).slice(0, 4).forEach((t) => {
        const wch = t.length * 5.4 + 12;
        parts.push(
          `<rect x="${cx}" y="${cy - 11}" width="${wch}" height="16" rx="8" fill="#0F172A" stroke="#334155"/>` +
            `<text x="${cx + wch / 2}" y="${cy}" font-size="9.5" text-anchor="middle" fill="${accent}" font-family="system-ui, sans-serif">${esc(t)}</text>`
        );
        cx += wch + 5;
      });
    } else if (n.type === "decision") {
      const cx = n.x + n.w / 2;
      const cy = n.y + n.h / 2;
      parts.push(
        `<polygon points="${cx},${n.y} ${n.x + n.w},${cy} ${cx},${n.y + n.h} ${n.x},${cy}" fill="#1E293B" stroke="${accent}" stroke-width="1.6"/>`
      );
      wrap(n.title, Math.round(n.w / 8), 3).forEach((l, i) =>
        parts.push(
          `<text x="${cx}" y="${cy - 8 + i * 15 + (wrap(n.title, Math.round(n.w / 8), 3).length === 1 ? 4 : 0)}" font-size="12" font-weight="600" text-anchor="middle" fill="#FDE68A" font-family="system-ui, sans-serif">${esc(l)}</text>`
        )
      );
    } else if (n.type === "sticky") {
      parts.push(
        `<rect x="${n.x + 3}" y="${n.y + 5}" width="${n.w}" height="${n.h}" rx="4" fill="#000" opacity="0.25"/>` +
          `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="4" fill="#FDE68A"/>`
      );
      wrap(n.body ?? n.title ?? "", Math.round((n.w - 28) / 6.0), 8).forEach((l, i) =>
        parts.push(
          `<text x="${n.x + 14}" y="${n.y + 22 + i * 15}" font-size="11.5" fill="#78350F" font-family="system-ui, sans-serif">${esc(l)}</text>`
        )
      );
    } else {
      wrap(n.title, Math.round(n.w / 9), 2).forEach((l, i) =>
        parts.push(
          `<text x="${n.x}" y="${n.y + 20 + i * 21}" font-size="17" font-weight="700" fill="#E2E8F0" font-family="system-ui, sans-serif">${esc(l)}</text>`
        )
      );
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${minX} ${minY} ${W} ${H}">` +
    `<rect x="${minX}" y="${minY}" width="${W}" height="${H}" fill="#0F172A"/>` +
    parts.join("") +
    `</svg>`
  );
}

export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function exportPNG(svg: string, name = "flowjam", scale = 2) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("svg load error"));
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no ctx");
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (blob) downloadBlob(blob, `${name}.png`, "image/png");
}
