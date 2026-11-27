"use client";

import {
  Diamond,
  Hand,
  Maximize,
  Minus,
  MousePointer2,
  Plus,
  RectangleHorizontal,
  StickyNote,
  Type,
  Waypoints,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFlow } from "@/lib/flow/store";
import type { Tool } from "@/lib/flow/types";

const TOOLS: {
  id: Tool;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  kbd: string;
}[] = [
  { id: "select", icon: MousePointer2, label: "Seleccionar", kbd: "V" },
  { id: "hand", icon: Hand, label: "Mover lienzo", kbd: "H o Espacio" },
  { id: "card", icon: RectangleHorizontal, label: "Tarjeta", kbd: "R" },
  { id: "decision", icon: Diamond, label: "Decisión (rombo)", kbd: "D" },
  { id: "sticky", icon: StickyNote, label: "Nota adhesiva", kbd: "S" },
  { id: "text", icon: Type, label: "Texto", kbd: "T" },
  { id: "connect", icon: Waypoints, label: "Conector", kbd: "C" },
];

function ToolButton({
  active,
  onClick,
  icon: Icon,
  label,
  kbd,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  kbd: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-150 active:scale-95 ${
            active
              ? "bg-cyan-400/15 text-cyan-300 shadow-[inset_0_0_0_1.5px_rgba(34,211,238,0.55)]"
              : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
          }`}
        >
          <Icon size={19} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="border-[#1E293B] bg-[#1E293B] text-slate-200">
        {label} · <span className="font-mono text-[10px] text-cyan-300">{kbd}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export function Toolbox() {
  const tool = useFlow((s) => s.tool);
  const setTool = useFlow((s) => s.setTool);
  const zoom = useFlow((s) => s.viewport.zoom);
  const zoomAt = useFlow((s) => s.zoomAt);
  const zoomReset = useFlow((s) => s.zoomReset);
  const fitView = useFlow((s) => s.fitView);

  return (
    <>
      {/* main tool palette — FigJam style */}
      <div className="absolute top-16 left-3 z-30 flex flex-col gap-1 rounded-2xl border border-[#1E293B] bg-[#0B1322]/95 p-1.5 shadow-2xl backdrop-blur md:left-4">
        {TOOLS.map((t) => (
          <ToolButton
            key={t.id}
            active={tool === t.id}
            onClick={() => {
              setTool(t.id);
              if (t.id !== "connect") useFlow.getState().setConnectingFrom(null);
            }}
            icon={t.icon}
            label={t.label}
            kbd={t.kbd}
          />
        ))}
      </div>

      {/* zoom cluster */}
      <div className="absolute bottom-6 left-3 z-30 flex flex-row items-center gap-1 rounded-2xl border border-[#1E293B] bg-[#0B1322]/95 p-1.5 shadow-2xl backdrop-blur md:left-4">
        <button
          onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.25)}
          aria-label="Alejar"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-slate-200 active:scale-95"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={zoomReset}
          aria-label="Zoom al 100%"
          className="w-12 rounded-lg py-1.5 text-center text-[11.5px] font-medium text-slate-300 transition hover:bg-white/5 md:w-10"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.25)}
          aria-label="Acercar"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-slate-200 active:scale-95"
        >
          <Plus size={16} />
        </button>
        <div className="mx-1 h-px w-6 bg-[#1E293B]" />
        <button
          onClick={() => fitView(window.innerWidth, window.innerHeight)}
          aria-label="Ajustar a la pantalla"
          title="Ajustar (1)"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-slate-200 active:scale-95"
        >
          <Maximize size={15} />
        </button>
      </div>
    </>
  );
}
