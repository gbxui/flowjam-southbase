"use client";

import { useMemo } from "react";
import { useFlow } from "@/lib/flow/store";
import { edgeGeometry } from "@/lib/flow/geometry";

export function EdgesLayer({
  preview,
}: {
  preview: { x: number; y: number } | null;
}) {
  const edges = useFlow((s) => s.edges);
  const nodes = useFlow((s) => s.nodes);
  const selectedEdges = useFlow((s) => s.selection.edges);
  const tool = useFlow((s) => s.tool);
  const connectingFrom = useFlow((s) => s.connectingFrom);
  const selectEdge = useFlow((s) => s.selectEdge);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const previewGeom = useMemo(() => {
    if (!connectingFrom || !preview) return null;
    const a = byId.get(connectingFrom);
    if (!a) return null;
    const x2 = preview.x;
    const y2 = preview.y;
    const g = edgeGeometry(a, {
      ...a,
      x: x2 - a.w / 2,
      y: y2 - a.h / 2,
    });
    return `M ${g.p0.x} ${g.p0.y} L ${x2} ${y2}`;
  }, [connectingFrom, preview, byId]);

  return (
    <svg
      className="pointer-events-none absolute top-0 left-0 overflow-visible"
      width={1}
      height={1}
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7.5"
          markerHeight="7.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#64748B" />
        </marker>
        <marker
          id="arrow-selected"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7.5"
          markerHeight="7.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#22D3EE" />
        </marker>
        <marker
          id="arrow-preview"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#22D3EE" />
        </marker>
      </defs>

      {edges.map((e) => {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (!a || !b) return null;
        const g = edgeGeometry(a, b);
        const isSel = selectedEdges.includes(e.id);
        const color = isSel ? "#22D3EE" : "#5B6B82";
        const width = isSel ? 2.4 : 1.75;
        return (
          <g key={e.id} className="group">
            <path
              d={g.path}
              fill="none"
              stroke={color}
              strokeWidth={width}
              strokeDasharray={e.dashed ? "7 6" : undefined}
              markerEnd={isSel ? "url(#arrow-selected)" : "url(#arrow)"}
            />
            <path
              d={g.path}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              className="pointer-events-auto cursor-pointer"
              onPointerDown={(ev) => {
                if (tool !== "select") return;
                ev.stopPropagation();
                selectEdge(e.id, ev.shiftKey);
              }}
            />
            {e.label && (
              <g>
                <rect
                  x={g.mid.x - (e.label.length * 5.4 + 12) / 2}
                  y={g.mid.y - 17}
                  width={e.label.length * 5.4 + 12}
                  height={17}
                  rx={8}
                  fill="#0F172A"
                  stroke={isSel ? "#22D3EE" : "#334155"}
                />
                <text
                  x={g.mid.x}
                  y={g.mid.y - 5}
                  textAnchor="middle"
                  fontSize={10}
                  fill={isSel ? "#22D3EE" : "#94A3B8"}
                  className="select-none"
                  style={{ fontFamily: "system-ui, sans-serif" }}
                >
                  {e.label}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {previewGeom && (
        <path
          d={previewGeom}
          fill="none"
          stroke="#22D3EE"
          strokeWidth={2}
          strokeDasharray="6 6"
          markerEnd="url(#arrow-preview)"
        />
      )}
    </svg>
  );
}
