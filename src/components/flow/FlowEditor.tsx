"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NodeView } from "./NodeView";
import { EdgesLayer } from "./EdgesLayer";
import { useFlow, STORAGE_KEY } from "@/lib/flow/store";
import type { Tool } from "@/lib/flow/types";

const TOOL_CURSOR: Record<Tool, string> = {
  select: "default",
  hand: "grab",
  card: "crosshair",
  decision: "crosshair",
  sticky: "crosshair",
  text: "crosshair",
  connect: "crosshair",
};

const SHAPE_TOOLS = new Set<Tool>(["card", "decision", "sticky", "text"]);

export default function FlowEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodes = useFlow((s) => s.nodes);
  const viewport = useFlow((s) => s.viewport);
  const tool = useFlow((s) => s.tool);
  const connectingFrom = useFlow((s) => s.connectingFrom);

  const [marquee, setMarquee] = useState<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const panRef = useRef<{
    sx: number;
    sy: number;
    vx: number;
    vy: number;
  } | null>(null);
  const marqueeRef = useRef<{
    sx: number;
    sy: number;
  } | null>(null);
  const pinchRef = useRef<{
    d0: number;
    zoom0: number;
    mx: number;
    my: number;
    wx: number;
    wy: number;
  } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  // ── hydrate from localStorage (once) ─────────────────────────
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    useFlow.getState().hydrate();
  }, []);

  // ── autosave ─────────────────────────────────────────────────
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const unsub = useFlow.subscribe((s, prev) => {
      if (s.nodes !== prev.nodes || s.edges !== prev.edges) {
        if (t) clearTimeout(t);
        t = setTimeout(() => {
          try {
            const cur = useFlow.getState();
            window.localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({ version: 1, nodes: cur.nodes, edges: cur.edges })
            );
            cur.markSaved();
          } catch {
            /* storage full — ignore */
          }
        }, 500);
      }
    });
    return () => {
      unsub();
      if (t) clearTimeout(t);
    };
  }, []);

  const toWorld = useCallback((sx: number, sy: number) => {
    const vp = useFlow.getState().viewport;
    return { x: (sx - vp.x) / vp.zoom, y: (sy - vp.y) / vp.zoom };
  }, []);

  // ── wheel: zoom (ctrl) / pan ─────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const st = useFlow.getState();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const unit = e.deltaMode === 1 ? 33 : 1;
      if (e.ctrlKey || e.metaKey) {
        st.zoomAt(cx, cy, e.deltaY * unit < 0 ? 1.08 : 1 / 1.08);
      } else if (e.shiftKey && e.deltaX === 0) {
        st.panBy(-e.deltaY * unit, 0);
      } else {
        st.panBy(-e.deltaX * unit, -e.deltaY * unit);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      return (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping(e.target)) {
        e.preventDefault();
        setSpaceDown(true);
        return;
      }
      if (isTyping(e.target)) return;
      const st = useFlow.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        st.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        st.duplicateSelection();
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        st.selectAll();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        st.deleteSelection();
        return;
      }
      if (e.key === "Escape") {
        if (st.connectingFrom) st.setConnectingFrom(null);
        else if (st.editingNodeId) st.setEditing(null);
        else st.clearSelection();
        return;
      }
      if (e.key === "1") {
        st.fitView(window.innerWidth, window.innerHeight);
        return;
      }
      if (e.key === "+" || e.key === "=") {
        st.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.2);
        return;
      }
      if (e.key === "-") {
        st.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.2);
        return;
      }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowRight" ? d : e.key === "ArrowLeft" ? -d : 0;
        const dy = e.key === "ArrowDown" ? d : e.key === "ArrowUp" ? -d : 0;
        if (st.selection.nodes.length) {
          if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
          else st.beginInteraction();
          nudgeTimer.current = setTimeout(() => {
            st.endInteraction();
            nudgeTimer.current = null;
          }, 700);
          st.nudgeSelection(dx, dy);
        }
        return;
      }
      if (mod || e.altKey) return;
      const map: Record<string, Tool> = {
        v: "select", h: "hand", r: "card", d: "decision",
        s: "sticky", t: "text", c: "connect",
      };
      const next = map[e.key.toLowerCase()];
      if (next) st.setTool(next);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // ── background pointer handling ──────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    const st = useFlow.getState();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      // begin pinch
      const [a, b] = Array.from(pointers.current.values());
      const d0 = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const vp = st.viewport;
      pinchRef.current = {
        d0,
        zoom0: vp.zoom,
        mx,
        my,
        wx: (mx - vp.x) / vp.zoom,
        wy: (my - vp.y) / vp.zoom,
      };
      panRef.current = null;
      marqueeRef.current = null;
      setMarquee(null);
      return;
    }
    if (e.button === 1 || tool === "hand" || spaceDown) {
      e.preventDefault();
      setIsPanning(true);
      panRef.current = {
        sx: e.clientX,
        sy: e.clientY,
        vx: st.viewport.x,
        vy: st.viewport.y,
      };
      return;
    }
    if (e.button !== 0) return;

    if (tool === "connect") {
      st.setConnectingFrom(null);
      return;
    }
    if (SHAPE_TOOLS.has(tool)) {
      const rect = containerRef.current!.getBoundingClientRect();
      const w = toWorld(e.clientX - rect.left, e.clientY - rect.top);
      const id = st.addNode({ type: tool, x: w.x - 110, y: w.y - 60 }, true);
      st.setTool("select");
      if (tool === "sticky" || tool === "text") st.setEditing(id);
      return;
    }
    // select tool on background → marquee
    marqueeRef.current = { sx: e.clientX, sy: e.clientY };
    if (!e.shiftKey) st.clearSelection();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = useFlow.getState();
    if (pointers.current.has(e.pointerId))
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinchRef.current && pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const p = pinchRef.current;
      const zoom = Math.min(4, Math.max(0.2, p.zoom0 * (d / p.d0)));
      st.setViewport({ zoom, x: mx - p.wx * zoom, y: my - p.wy * zoom });
      return;
    }

    if (connectingFrom) {
      const rect = containerRef.current!.getBoundingClientRect();
      setPreview(toWorld(e.clientX - rect.left, e.clientY - rect.top));
      return;
    }
    if (panRef.current) {
      const p = panRef.current;
      st.setViewport({
        ...st.viewport,
        x: p.vx + (e.clientX - p.sx),
        y: p.vy + (e.clientY - p.sy),
      });
      return;
    }
    if (marqueeRef.current) {
      setMarquee({
        x0: marqueeRef.current.sx,
        y0: marqueeRef.current.sy,
        x1: e.clientX,
        y1: e.clientY,
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;
    if (panRef.current) {
      panRef.current = null;
      setIsPanning(false);
      return;
    }
    if (marqueeRef.current) {
      const m = marquee;
      marqueeRef.current = null;
      setMarquee(null);
      if (m) {
        const rect = containerRef.current!.getBoundingClientRect();
        const a = toWorld(Math.min(m.x0, m.x1) - rect.left, Math.min(m.y0, m.y1) - rect.top);
        const b = toWorld(Math.max(m.x0, m.x1) - rect.left, Math.max(m.y0, m.y1) - rect.top);
        useFlow
          .getState()
          .marqueeSelect({ x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }, e.shiftKey);
      }
      return;
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (tool !== "select") return;
    const st = useFlow.getState();
    const rect = containerRef.current!.getBoundingClientRect();
    const w = toWorld(e.clientX - rect.left, e.clientY - rect.top);
    const id = st.addNode({ type: "text", x: w.x - 20, y: w.y - 16 }, true);
    st.setEditing(id);
  };

  const cursor = spaceDown
    ? "grab"
    : isPanning
      ? "grabbing"
      : connectingFrom
        ? "crosshair"
        : TOOL_CURSOR[tool];

  // ── dot grid ──────────────────────────────────────────────────
  const grid = 26 * viewport.zoom;

  return (
    <div
      ref={containerRef}
      data-canvas
      className="absolute inset-0 touch-none overflow-hidden bg-[#0F172A]"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, #1E293B ${Math.max(0.8, viewport.zoom)}px, transparent ${Math.max(0.8, viewport.zoom)}px)`,
          backgroundSize: `${grid}px ${grid}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          opacity: 0.85,
        }}
      />
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          willChange: "transform",
        }}
      >
        <EdgesLayer preview={preview} />
        {nodes.map((n) => (
          <NodeView key={n.id} node={n} />
        ))}
      </div>

      {marquee && (
        <div
          className="pointer-events-none absolute z-20 rounded-[3px] border border-cyan-400/90 bg-cyan-400/10"
          style={{
            left: Math.min(marquee.x0, marquee.x1),
            top: Math.min(marquee.y0, marquee.y1),
            width: Math.abs(marquee.x1 - marquee.x0),
            height: Math.abs(marquee.y1 - marquee.y0),
          }}
        />
      )}

      <div className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 rounded-full border border-[#1E293B] bg-[#0F172A]/90 px-4 py-1.5 text-[11px] text-slate-500 shadow-xl backdrop-blur md:block">
        Doble clic: editar tarjeta · <span className="text-slate-400">C</span> conectar ·{" "}
        <span className="text-slate-400">Supr</span> borrar ·{" "}
        <span className="text-slate-400">Ctrl+Z</span> deshacer ·{" "}
        <span className="text-slate-400">1</span> ver todo · rueda +{" "}
        <span className="text-slate-400">Ctrl</span>: zoom
      </div>
    </div>
  );
}
