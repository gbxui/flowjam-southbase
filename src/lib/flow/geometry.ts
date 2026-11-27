import type { FlowEdge, FlowNode } from "./types";

export interface Pt {
  x: number;
  y: number;
}

const center = (n: FlowNode): Pt => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });

/** Intersection of the center→target line with the node's shape border. */
export function shapeAnchor(node: FlowNode, towards: Pt): Pt {
  const c = center(node);
  const dx = towards.x - c.x;
  const dy = towards.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const hw = node.w / 2;
  const hh = node.h / 2;
  let s: number;
  if (node.type === "decision") {
    // rhombus: |dx|/hw + |dy|/hh = 1
    s = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh || 1);
  } else {
    const sx = dx === 0 ? Infinity : hw / Math.abs(dx);
    const sy = dy === 0 ? Infinity : hh / Math.abs(dy);
    s = Math.min(sx, sy);
  }
  return { x: c.x + dx * s, y: c.y + dy * s };
}

export interface EdgeGeom {
  p0: Pt;
  p1: Pt;
  c0: Pt;
  c1: Pt;
  mid: Pt;
  path: string;
}

export function edgeGeometry(from: FlowNode, to: FlowNode): EdgeGeom {
  const target = center(to);
  const p0 = shapeAnchor(from, target);
  const source = center(from);
  const p1 = shapeAnchor(to, source);
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  let c0: Pt;
  let c1: Pt;
  if (Math.abs(dx) > Math.abs(dy)) {
    const k = Math.max(Math.abs(dx) * 0.45, 30);
    c0 = { x: p0.x + Math.sign(dx || 1) * k, y: p0.y };
    c1 = { x: p1.x - Math.sign(dx || 1) * k, y: p1.y };
  } else {
    const k = Math.max(Math.abs(dy) * 0.45, 24);
    c0 = { x: p0.x, y: p0.y + Math.sign(dy || 1) * k };
    c1 = { x: p1.x, y: p1.y - Math.sign(dy || 1) * k };
  }
  // cubic midpoint (t = 0.5)
  const mid = {
    x:
      0.125 * p0.x +
      0.375 * c0.x +
      0.375 * c1.x +
      0.125 * p1.x,
    y:
      0.125 * p0.y +
      0.375 * c0.y +
      0.375 * c1.y +
      0.125 * p1.y,
  };
  const path = `M ${p0.x} ${p0.y} C ${c0.x} ${c0.y}, ${c1.x} ${c1.y}, ${p1.x} ${p1.y}`;
  return { p0, p1, c0, c1, mid, path };
}

export function edgeById(nodes: FlowNode[], id: string): FlowNode | undefined {
  return nodes.find((n) => n.id === id);
}

export function edgesOf(edges: FlowEdge[], nodeId: string): FlowEdge[] {
  return edges.filter((e) => e.from === nodeId || e.to === nodeId);
}
