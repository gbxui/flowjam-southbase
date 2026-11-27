"use client";

import { useEffect, useRef } from "react";
import {
  Briefcase,
  Camera,
  CalendarClock,
  CreditCard,
  FileSearch,
  FileSignature,
  FileText,
  Globe,
  Hammer,
  ListChecks,
  Mail,
  MessageSquareDot,
  Presentation,
  RefreshCw,
  Reply,
  Rocket,
  Search,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useFlow } from "@/lib/flow/store";
import type { FlowNode } from "@/lib/flow/types";
import { COLORS } from "@/lib/flow/types";

const ICONS: Record<string, LucideIcon> = {
  Mail, Users, Camera, Search, Briefcase, Reply, CalendarClock,
  FileSearch, FileText, FileSignature, Rocket, Hammer, Globe,
  MessageSquareDot, ListChecks, Video, Presentation, CreditCard,
  TrendingUp, RefreshCw,
};

const MIN_SIZES: Record<FlowNode["type"], { w: number; h: number }> = {
  card: { w: 150, h: 90 },
  decision: { w: 120, h: 90 },
  sticky: { w: 130, h: 100 },
  text: { w: 90, h: 30 },
};

export function NodeView({ node }: { node: FlowNode }) {
  const tool = useFlow((s) => s.tool);
  const selected = useFlow((s) => s.selection.nodes.includes(node.id));
  const editing = useFlow((s) => s.editingNodeId === node.id);
  const connectingFrom = useFlow((s) => s.connectingFrom);
  const zoom = useFlow((s) => s.viewport.zoom);
  const selectNode = useFlow((s) => s.selectNode);
  const setEditing = useFlow((s) => s.setEditing);
  const setConnectingFrom = useFlow((s) => s.setConnectingFrom);
  const connect = useFlow((s) => s.connect);
  const setTool = useFlow((s) => s.setTool);
  const updateNode = useFlow((s) => s.updateNode);
  const beginInteraction = useFlow((s) => s.beginInteraction);
  const endInteraction = useFlow((s) => s.endInteraction);
  const cancelInteraction = useFlow((s) => s.cancelInteraction);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origins: Map<string, { x: number; y: number }>;
  } | null>(null);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    w: number;
    h: number;
  } | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.select();
    }
  }, [editing]);

  const accent = COLORS[node.color]?.accent ?? COLORS.slate.accent;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (tool === "hand") return;

    if (tool === "connect") {
      // read live state (robust even if this fires before a re-render)
      const liveFrom = useFlow.getState().connectingFrom;
      if (!liveFrom) {
        setConnectingFrom(node.id);
      } else if (liveFrom === node.id) {
        setConnectingFrom(null);
      } else {
        connect(liveFrom, node.id);
        setConnectingFrom(null);
        setTool("select");
      }
      return;
    }
    if (tool !== "select") return;

    if (editing) {
      // clicking elsewhere inside another node: just let blur commit
      return;
    }

    const additive = e.shiftKey;
    const wasSelected = useFlow.getState().selection.nodes.includes(node.id);
    if (additive) {
      selectNode(node.id, true);
    } else if (!wasSelected) {
      selectNode(node.id, false);
    }

    const st = useFlow.getState();
    const origins = new Map(
      st.nodes
        .filter((n) => st.selection.nodes.includes(n.id))
        .map((n) => [n.id, { x: n.x, y: n.y }])
    );
    beginInteraction();
    movedRef.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origins };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointer — drag still works via bubbling */
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (resizeRef.current) {
      const r = resizeRef.current;
      const dx = (e.clientX - r.startX) / zoom;
      const dy = (e.clientY - r.startY) / zoom;
      const min = MIN_SIZES[node.type];
      updateNode(node.id, {
        w: Math.max(min.w, Math.round((r.w + dx) / 4) * 4),
        h: Math.max(min.h, Math.round((r.h + dy) / 4) * 4),
      });
      return;
    }
    if (!dragRef.current) return;
    const d = dragRef.current;
    const dx = (e.clientX - d.startX) / zoom;
    const dy = (e.clientY - d.startY) / zoom;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    movedRef.current = true;
    const st = useFlow.getState();
    for (const n of st.nodes) {
      const o = d.origins.get(n.id);
      if (o) updateNode(n.id, { x: o.x + dx, y: o.y + dy });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (resizeRef.current) {
      resizeRef.current = null;
      endInteraction();
      return;
    }
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    endInteraction();
  };

  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    beginInteraction();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, w: node.w, h: node.h };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointer */
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tool !== "select") return;
    beginInteraction();
    setEditing(node.id);
  };

  const commitEdit = (value: string) => {
    if (node.type === "sticky") {
      if (value !== (node.body ?? "")) updateNode(node.id, { body: value });
    } else {
      if (value !== node.title) updateNode(node.id, { title: value });
    }
    endInteraction();
    setEditing(null);
  };

  const cancelEdit = () => {
    cancelInteraction();
    setEditing(null);
  };

  const onTaKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    const multi = node.type === "sticky";
    if (e.key === "Escape") {
      if (multi) commitEdit((taRef.current?.value ?? "").trim());
      else cancelEdit();
    } else if (e.key === "Enter" && !e.shiftKey && !multi) {
      commitEdit((taRef.current?.value ?? "").trim());
    }
  };

  const isConnectSource = connectingFrom === node.id;
  const Icon = node.icon ? ICONS[node.icon] : null;

  // ── editing mode ───────────────────────────────────────────────
  const editor = (
    <textarea
      ref={taRef}
      defaultValue={
        node.type === "sticky" ? node.body ?? "" : node.title
      }
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={(e) => commitEdit(e.target.value.trim())}
      onKeyDown={onTaKeyDown}
      spellCheck={false}
      className="nodrag h-full w-full resize-none bg-transparent text-[13.5px] font-semibold leading-snug text-slate-100 outline-none"
      style={
        node.type === "sticky"
          ? { fontWeight: 400, color: "#78350F" }
          : undefined
      }
    />
  );

  // ── decision (diamond) ────────────────────────────────────────
  if (node.type === "decision") {
    return (
      <div
        className="group absolute"
        style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <div
          className="absolute inset-0 transition-colors"
          style={{
            clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            background: isConnectSource
              ? "#22D3EE"
              : selected
                ? "#22D3EE"
                : tool === "connect"
                  ? accent
                  : "#F59E0B",
          }}
        >
          <div
            className="absolute inset-[2.5px] flex items-center justify-center bg-[#16223A]"
            style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
          >
            {editing ? (
              <div className="h-[56%] w-[64%]">{editor}</div>
            ) : (
              <div className="max-w-[62%] text-center text-[12px] font-semibold leading-tight text-amber-100 select-none">
                {node.title}
              </div>
            )}
          </div>
        </div>
        {selected && tool === "select" && (
          <div
            className="absolute -bottom-1 -right-1 z-10 h-3.5 w-3.5 cursor-nwse-resize rounded-[3px] border border-[#0F172A] bg-cyan-400"
            onPointerDown={startResize}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        )}
      </div>
    );
  }

  // ── sticky note ───────────────────────────────────────────────
  if (node.type === "sticky") {
    return (
      <div
        className="group absolute"
        style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <div
          className={`flex h-full w-full items-start rounded-[6px] p-3.5 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.55)] transition-shadow ${selected ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0F172A]" : ""}`}
          style={{
            background: "#FDE68A",
            transform: "rotate(-0.6deg)",
          }}
        >
          {editing ? (
            editor
          ) : (
            <div className="select-none whitespace-pre-wrap break-words text-[12px] leading-[1.4] font-medium text-[#78350F]">
              {node.body}
            </div>
          )}
        </div>
        {selected && tool === "select" && (
          <div
            className="absolute -bottom-1.5 -right-1.5 z-10 h-3.5 w-3.5 cursor-nwse-resize rounded-[3px] border border-[#0F172A] bg-cyan-400"
            onPointerDown={startResize}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        )}
      </div>
    );
  }

  // ── plain text node ───────────────────────────────────────────
  if (node.type === "text") {
    return (
      <div
        className="group absolute"
        style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        {editing ? (
          editor
        ) : (
          <div
            className={`select-none text-[17px] font-bold leading-tight break-words ${selected ? "rounded-md bg-cyan-400/10 px-2 py-0.5 text-cyan-300" : "text-slate-200"}`}
          >
            {node.title}
          </div>
        )}
      </div>
    );
  }

  // ── standard card ─────────────────────────────────────────────
  const isSource = connectingFrom === node.id;
  return (
    <div
      className="group absolute"
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      <div
        className="relative flex h-full w-full flex-col rounded-2xl border bg-[#1E293B] transition-all duration-100"
        style={{
          borderColor:
            selected || isSource ? accent : tool === "connect" ? "#0EA5B7" : "#334155",
          boxShadow:
            selected || isSource
              ? `0 0 0 2px ${accent}44, 0 12px 34px -12px ${accent}55`
              : "0 6px 18px -10px rgba(0,0,0,0.5)",
          cursor: tool === "connect" ? "crosshair" : undefined,
        }}
      >
        <div
          className="absolute top-4 bottom-4 left-0 w-[4px] rounded-r-full"
          style={{ background: accent }}
        />
        <div className="flex items-center gap-2 px-4 pt-3">
          {node.phase !== null && node.phase !== undefined && (
            <span
              className="shrink-0 rounded-md border px-1.5 py-[1px] font-mono text-[10px] leading-[15px]"
              style={{ color: accent, borderColor: `${accent}55`, background: "#0F172A88" }}
            >
              {String(node.phase).padStart(2, "0")}
            </span>
          )}
          {Icon && <Icon size={13} style={{ color: accent, flexShrink: 0 }} />}
          {editing ? (
            <div className="min-w-0 flex-1">{editor}</div>
          ) : (
            <div className="min-w-0 flex-1 select-none truncate text-[13.5px] font-semibold text-slate-100">
              {node.title}
            </div>
          )}
        </div>
        {!editing && (node.body || node.type === "sticky") && (
          <div className="mt-1.5 px-4 pb-7 text-[11.5px] leading-[1.45] font-normal text-slate-400 select-none">
            <div className="line-clamp-5 whitespace-pre-wrap break-words">{node.body}</div>
          </div>
        )}
        {!editing && node.tags && node.tags.length > 0 && (
          <div className="absolute bottom-2.5 left-4 flex flex-wrap gap-1 pr-4">
            {node.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[#334155] bg-[#0F172A] px-2 py-[2px] text-[9.5px] leading-[14px] text-slate-300 select-none"
                style={{ color: accent }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      {selected && tool === "select" && (
        <div
          className="absolute -right-1.5 -bottom-1.5 z-10 h-3.5 w-3.5 cursor-nwse-resize rounded-[3px] border border-[#0F172A] bg-cyan-400"
          onPointerDown={startResize}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      )}
    </div>
  );
}
