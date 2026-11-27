"use client";

import { create } from "zustand";
import type {
  FlowEdge,
  FlowNode,
  FlowOp,
  NodeColor,
  NodeType,
  Snapshot,
  Tool,
} from "./types";
import { NODE_DEFAULT_SIZES } from "./types";
import { defaultFlow } from "./defaults";

const initial = defaultFlow();

export const STORAGE_KEY = "sbs-flow-v1";

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface FlowState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selection: { nodes: string[]; edges: string[] };
  tool: Tool;
  viewport: Viewport;
  connectingFrom: string | null;
  editingNodeId: string | null;
  aiPanelOpen: boolean;
  savedAt: number | null;
  // history
  past: Snapshot[];
  future: Snapshot[];
  pendingSnapshot: Snapshot | null;
  // actions
  setTool: (t: Tool) => void;
  setEditing: (id: string | null) => void;
  setConnectingFrom: (id: string | null) => void;
  toggleAIPanel: (open?: boolean) => void;
  hydrate: () => boolean;
  markSaved: () => void;
  resetFlow: () => void;

  selectNode: (id: string, additive?: boolean) => void;
  selectEdge: (id: string, additive?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  marqueeSelect: (rect: { x: number; y: number; w: number; h: number }, additive?: boolean) => void;

  addNode: (partial: Partial<FlowNode> & { type: NodeType }, select?: boolean) => string;
  updateNode: (id: string, patch: Partial<FlowNode>) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  nudgeSelection: (dx: number, dy: number) => void;
  connect: (from: string, to: string, label?: string) => void;
  updateEdge: (id: string, patch: Partial<FlowEdge>) => void;

  beginInteraction: () => void;
  endInteraction: () => void;
  cancelInteraction: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  setViewport: (v: Viewport) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (screenX: number, screenY: number, factor: number) => void;
  fitView: (cw: number, ch: number) => void;
  zoomReset: () => void;

  applyOps: (ops: unknown[]) => { applied: number; summary: string[] };

  exportJSON: () => string;
  importJSON: (json: string) => boolean;
}

const clone = (s: { nodes: FlowNode[]; edges: FlowEdge[] }): Snapshot => ({
  nodes: s.nodes.map((n) => ({ ...n, tags: n.tags ? [...n.tags] : undefined })),
  edges: s.edges.map((e) => ({ ...e })),
});

const uid = () =>
  `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const COLOR_KEYS: NodeColor[] = ["cyan", "amber", "emerald", "violet", "rose", "slate"];
const TYPE_KEYS: NodeType[] = ["card", "decision", "sticky", "text"];

function sanitizeNodeInput(input: Record<string, unknown>): Partial<FlowNode> & { type?: NodeType } {
  const out: Partial<FlowNode> & { type?: NodeType } = {};
  const t = String(input.type ?? "card");
  out.type = (TYPE_KEYS as string[]).includes(t) ? (t as NodeType) : "card";
  if (typeof input.title === "string") out.title = input.title.slice(0, 120);
  if (typeof input.body === "string") out.body = input.body.slice(0, 900);
  if (Array.isArray(input.tags)) {
    out.tags = input.tags
      .filter((x): x is string => typeof x === "string")
      .slice(0, 6)
      .map((x) => x.slice(0, 42));
  }
  const c = String(input.color ?? "");
  out.color = (COLOR_KEYS as string[]).includes(c) ? (c as NodeColor) : undefined;
  if (typeof input.x === "number" && Number.isFinite(input.x)) out.x = Math.round(clamp(input.x, -4000, 16000));
  if (typeof input.y === "number" && Number.isFinite(input.y)) out.y = Math.round(clamp(input.y, -4000, 12000));
  const size = NODE_DEFAULT_SIZES[out.type];
  const w = typeof input.w === "number" && Number.isFinite(input.w) ? input.w : size.w;
  const h = typeof input.h === "number" && Number.isFinite(input.h) ? input.h : size.h;
  out.w = Math.round(clamp(w, 110, 700));
  out.h = Math.round(clamp(h, 50, 500));
  if (input.phase === null) out.phase = null;
  else if (typeof input.phase === "number" && Number.isFinite(input.phase))
    out.phase = clamp(Math.round(input.phase), 0, 99);
  return out;
}

export const useFlow = create<FlowState>((set, get) => ({
  nodes: initial.nodes,
  edges: initial.edges,
  selection: { nodes: [], edges: [] },
  tool: "select",
  viewport: { x: 80, y: 40, zoom: 0.62 },
  connectingFrom: null,
  editingNodeId: null,
  aiPanelOpen: false,
  savedAt: null,
  past: [],
  future: [],
  pendingSnapshot: null,

  setTool: (t) => set({ tool: t, connectingFrom: t === "connect" ? get().connectingFrom : null }),
  setEditing: (id) => set({ editingNodeId: id }),
  setConnectingFrom: (id) => set({ connectingFrom: id }),
  cancelInteraction: () => set({ pendingSnapshot: null }),
  toggleAIPanel: (open) =>
    set((s) => ({ aiPanelOpen: open === undefined ? !s.aiPanelOpen : open })),

  hydrate: () => {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as Snapshot;
      if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) return false;
      set({ nodes: data.nodes, edges: data.edges, past: [], future: [] });
      return true;
    } catch {
      return false;
    }
  },
  markSaved: () => set({ savedAt: Date.now() }),

  resetFlow: () => {
    get().pushHistory();
    const { nodes, edges } = defaultFlow();
    set({ nodes, edges, selection: { nodes: [], edges: [] }, editingNodeId: null });
  },

  selectNode: (id, additive) =>
    set((s) => {
      if (!additive) return { selection: { nodes: [id], edges: [] } };
      const has = s.selection.nodes.includes(id);
      return {
        selection: {
          nodes: has
            ? s.selection.nodes.filter((x) => x !== id)
            : [...s.selection.nodes, id],
          edges: s.selection.edges,
        },
      };
    }),
  selectEdge: (id, additive) =>
    set((s) => ({
      selection: {
        nodes: [],
        edges: additive
          ? s.selection.edges.includes(id)
            ? s.selection.edges.filter((x) => x !== id)
            : [...s.selection.edges, id]
          : [id],
      },
    })),
  clearSelection: () => set({ selection: { nodes: [], edges: [] } }),
  selectAll: () =>
    set((s) => ({ selection: { nodes: s.nodes.map((n) => n.id), edges: s.edges.map((e) => e.id) } })),
  marqueeSelect: (rect, additive) =>
    set((s) => {
      const hits = s.nodes
        .filter(
          (n) =>
            n.x < rect.x + rect.w &&
            n.x + n.w > rect.x &&
            n.y < rect.y + rect.h &&
            n.y + n.h > rect.y
        )
        .map((n) => n.id);
      return {
        selection: {
          nodes: additive ? Array.from(new Set([...s.selection.nodes, ...hits])) : hits,
          edges: [],
        },
      };
    }),

  addNode: (partial, select) => {
    get().pushHistory();
    const type = partial.type ?? "card";
    const size = NODE_DEFAULT_SIZES[type];
    const node: FlowNode = {
      id: uid(),
      type,
      color: partial.color ?? (type === "decision" ? "amber" : type === "sticky" ? "amber" : "cyan"),
      x: Math.round(partial.x ?? 0),
      y: Math.round(partial.y ?? 0),
      w: partial.w ?? size.w,
      h: partial.h ?? size.h,
      title: partial.title ?? (type === "sticky" ? "" : "Nueva tarjeta"),
      body: partial.body ?? "",
      tags: partial.tags ?? [],
      phase: partial.phase ?? null,
      icon: partial.icon,
    };
    set((s) => ({
      nodes: [...s.nodes, node],
      selection: select === false ? s.selection : { nodes: [node.id], edges: [] },
    }));
    return node.id;
  },

  updateNode: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    })),

  deleteSelection: () => {
    const { selection, nodes, edges } = get();
    if (!selection.nodes.length && !selection.edges.length) return;
    get().pushHistory();
    const nodeSet = new Set(selection.nodes);
    set({
      nodes: nodes.filter((n) => !nodeSet.has(n.id)),
      edges: edges.filter(
        (e) =>
          !selection.edges.includes(e.id) &&
          !nodeSet.has(e.from) &&
          !nodeSet.has(e.to)
      ),
      selection: { nodes: [], edges: [] },
      editingNodeId: null,
    });
  },

  duplicateSelection: () => {
    const { selection, nodes, edges } = get();
    if (!selection.nodes.length) return;
    get().pushHistory();
    const idMap = new Map<string, string>();
    const newNodes = nodes
      .filter((n) => selection.nodes.includes(n.id))
      .map((n) => {
        const id = uid();
        idMap.set(n.id, id);
        return {
          ...n,
          id,
          x: n.x + 28,
          y: n.y + 28,
          tags: n.tags ? [...n.tags] : undefined,
        };
      });
    const newEdges = edges
      .filter((e) => idMap.has(e.from) && idMap.has(e.to))
      .map((e) => ({ ...e, id: uid(), from: idMap.get(e.from)!, to: idMap.get(e.to)! }));
    set({
      nodes: [...nodes, ...newNodes],
      edges: [...edges, ...newEdges],
      selection: { nodes: newNodes.map((n) => n.id), edges: [] },
    });
  },

  nudgeSelection: (dx, dy) => {
    const { selection } = get();
    if (!selection.nodes.length) return;
    set((s) => ({
      nodes: s.nodes.map((n) =>
        selection.nodes.includes(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n
      ),
    }));
  },

  connect: (from, to, label) => {
    if (from === to) return;
    const { edges } = get();
    if (edges.some((e) => e.from === from && e.to === to)) return;
    get().pushHistory();
    set((s) => ({
      edges: [...s.edges, { id: uid(), from, to, label }],
      selection: { nodes: [], edges: [] },
    }));
  },

  updateEdge: (id, patch) =>
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  beginInteraction: () => {
    const { nodes, edges } = get();
    set({ pendingSnapshot: clone({ nodes, edges }) });
  },
  endInteraction: () => {
    const { pendingSnapshot, nodes, edges, past } = get();
    if (!pendingSnapshot) return;
    const changed =
      pendingSnapshot.nodes !== nodes &&
      (JSON.stringify(pendingSnapshot) !== JSON.stringify({ nodes, edges }));
    if (changed) {
      set({ past: [...past.slice(-49), pendingSnapshot], future: [] });
    }
    set({ pendingSnapshot: null });
  },
  pushHistory: () => {
    const { nodes, edges, past } = get();
    set({ past: [...past.slice(-49), clone({ nodes, edges })], future: [] });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    if (!past.length) return;
    const prev = past[past.length - 1];
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      past: past.slice(0, -1),
      future: [...future, clone({ nodes, edges })],
      selection: { nodes: [], edges: [] },
      editingNodeId: null,
    });
  },
  redo: () => {
    const { past, future, nodes, edges } = get();
    if (!future.length) return;
    const next = future[future.length - 1];
    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, clone({ nodes, edges })],
      future: future.slice(0, -1),
      selection: { nodes: [], edges: [] },
      editingNodeId: null,
    });
  },

  setViewport: (v) => set({ viewport: v }),
  panBy: (dx, dy) =>
    set((s) => ({ viewport: { ...s.viewport, x: s.viewport.x + dx, y: s.viewport.y + dy } })),
  zoomAt: (screenX, screenY, factor) =>
    set((s) => {
      const zoom = clamp(s.viewport.zoom * factor, 0.2, 4);
      const k = zoom / s.viewport.zoom;
      return {
        viewport: {
          zoom,
          x: screenX - (screenX - s.viewport.x) * k,
          y: screenY - (screenY - s.viewport.y) * k,
        },
      };
    }),
  fitView: (cw, ch) => {
    const { nodes } = get();
    if (!nodes.length) return;
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + n.w));
    const maxY = Math.max(...nodes.map((n) => n.y + n.h));
    const pad = 80;
    const zoom = clamp(
      Math.min(cw / (maxX - minX + pad * 2), ch / (maxY - minY + pad * 2)),
      0.2,
      1.4
    );
    set({
      viewport: {
        zoom,
        x: cw / 2 - ((minX + maxX) / 2) * zoom,
        y: ch / 2 - ((minY + maxY) / 2) * zoom,
      },
    });
  },
  zoomReset: () => set((s) => ({ viewport: { ...s.viewport, zoom: 1 } })),

  applyOps: (ops) => {
    if (!Array.isArray(ops) || !ops.length) return { applied: 0, summary: [] };
    const summary: string[] = [];
    let applied = 0;
    let firstAdd: Partial<FlowNode> & { type?: NodeType } | null = null;

    // validate pass first — apply only if every op is well-formed
    const valid: FlowOp[] = [];
    const st = get();
    const nodeIds = new Set(st.nodes.map((n) => n.id));
    for (const raw of ops) {
      if (!raw || typeof raw !== "object") continue;
      const o = raw as Record<string, unknown>;
      switch (o.op) {
        case "add_node":
          if (o.node && typeof o.node === "object") valid.push(o as FlowOp);
          break;
        case "add_sticky":
          valid.push(o as FlowOp);
          break;
        case "update_node":
          if (typeof o.id === "string" && nodeIds.has(o.id) && o.patch && typeof o.patch === "object")
            valid.push(o as FlowOp);
          break;
        case "delete_node":
          if (typeof o.id === "string" && nodeIds.has(o.id)) valid.push(o as FlowOp);
          break;
        case "add_edge":
          if (
            typeof o.from === "string" && nodeIds.has(o.from) &&
            typeof o.to === "string" && nodeIds.has(o.to)
          )
            valid.push(o as FlowOp);
          break;
        case "move_node":
          if (typeof o.id === "string" && nodeIds.has(o.id)) valid.push(o as FlowOp);
          break;
        default:
          break;
      }
    }
    if (!valid.length) return { applied: 0, summary: [] };

    get().pushHistory();
    set((s) => {
      let nodes = [...s.nodes];
      const edges = [...s.edges];
      const titleById = new Map(nodes.map((n) => [n.id, n.title]));
      for (const op of valid) {
        switch (op.op) {
          case "add_node": {
            const clean = sanitizeNodeInput(op.node as Record<string, unknown>);
            const type = clean.type ?? "card";
            const size = NODE_DEFAULT_SIZES[type];
            const node: FlowNode = {
              id: uid(),
              type,
              color: clean.color ?? (type === "sticky" ? "amber" : "cyan"),
              x: clean.x ?? 600,
              y: clean.y ?? 600,
              w: clean.w ?? size.w,
              h: clean.h ?? size.h,
              title: clean.title || (type === "sticky" ? "" : "Nueva tarjeta"),
              body: clean.body ?? "",
              tags: clean.tags ?? [],
              phase: clean.phase ?? null,
            };
            nodes.push(node);
            if (!firstAdd) firstAdd = { ...node };
            applied++;
            summary.push(`+ tarjeta «${node.title || "sticky"}»`);
            break;
          }
          case "add_sticky": {
            const text = String(op.text ?? op.title ?? "Nota IA") .slice(0, 400);
            const node: FlowNode = {
              id: uid(),
              type: "sticky",
              color: "amber",
              x: typeof op.x === "number" ? op.x : 600,
              y: typeof op.y === "number" ? op.y : 600,
              w: 220,
              h: 180,
              title: "",
              body: text,
              tags: [],
              phase: null,
            };
            nodes.push(node);
            applied++;
            summary.push(`+ nota «${text.slice(0, 24)}…»`);
            break;
          }
          case "update_node": {
            const p = op.patch as Record<string, unknown>;
            nodes = nodes.map((n) => {
              if (n.id !== op.id) return n;
              const next = { ...n };
              if (typeof p.title === "string") next.title = p.title.slice(0, 120);
              if (typeof p.body === "string") next.body = p.body.slice(0, 900);
              if (typeof p.phase === "number") next.phase = clamp(Math.round(p.phase), 0, 99);
              if (typeof p.x === "number") next.x = Math.round(clamp(p.x, -4000, 16000));
              if (typeof p.y === "number") next.y = Math.round(clamp(p.y, -4000, 12000));
              if (typeof p.color === "string" && (COLOR_KEYS as string[]).includes(p.color))
                next.color = p.color as NodeColor;
              if (Array.isArray(p.tags))
                next.tags = p.tags
                  .filter((x): x is string => typeof x === "string")
                  .slice(0, 6)
                  .map((x) => x.slice(0, 42));
              return next;
            });
            applied++;
            summary.push(`~ ${titleById.get(op.id) ?? op.id}`);
            break;
          }
          case "delete_node": {
            nodes = nodes.filter((n) => n.id !== op.id);
            for (let i = edges.length - 1; i >= 0; i--) {
              if (edges[i].from === op.id || edges[i].to === op.id) edges.splice(i, 1);
            }
            applied++;
            summary.push(`− ${titleById.get(op.id) ?? op.id}`);
            break;
          }
          case "add_edge": {
            if (!edges.some((e) => e.from === op.from && e.to === op.to)) {
              edges.push({
                id: uid(),
                from: op.from,
                to: op.to,
                label: typeof op.label === "string" ? op.label.slice(0, 60) : undefined,
                dashed: op.dashed === true,
              });
              applied++;
              summary.push(`→ ${titleById.get(op.from)} → ${titleById.get(op.to)}`);
            }
            break;
          }
          case "move_node": {
            nodes = nodes.map((n) =>
              n.id === op.id
                ? {
                    ...n,
                    x: Math.round(clamp(op.x, -4000, 16000)),
                    y: Math.round(clamp(op.y, -4000, 12000)),
                  }
                : n
            );
            applied++;
            break;
          }
        }
      }
      return { nodes, edges };
    });

    return { applied, summary };
  },

  exportJSON: () => {
    const { nodes, edges } = get();
    return JSON.stringify({ version: 1, nodes, edges }, null, 2);
  },
  importJSON: (json) => {
    try {
      const data = JSON.parse(json) as Snapshot;
      if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) return false;
      get().pushHistory();
      set({ nodes: data.nodes, edges: data.edges, selection: { nodes: [], edges: [] } });
      return true;
    } catch {
      return false;
    }
  },
}));
