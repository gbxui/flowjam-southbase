"use client";

import { useRef, useState } from "react";
import {
  Check,
  Download,
  FileJson,
  GitBranch,
  Image as ImageIcon,
  Redo2,
  RotateCcw,
  Shapes,
  Sparkles,
  Undo2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFlow } from "@/lib/flow/store";
import { buildSVG, downloadBlob, exportPNG } from "@/lib/flow/svgExport";

export function TopBar() {
  const undo = useFlow((s) => s.undo);
  const redo = useFlow((s) => s.redo);
  const canUndo = useFlow((s) => s.past.length > 0);
  const canRedo = useFlow((s) => s.future.length > 0);
  const savedAt = useFlow((s) => s.savedAt);
  const toggleAIPanel = useFlow((s) => s.toggleAIPanel);
  const aiOpen = useFlow((s) => s.aiPanelOpen);
  const resetFlow = useFlow((s) => s.resetFlow);
  const importJSON = useFlow((s) => s.importJSON);
  const nodes = useFlow((s) => s.nodes);
  const edges = useFlow((s) => s.edges);
  const fileRef = useRef<HTMLInputElement>(null);
  const [resetting, setResetting] = useState(false);

  const time = savedAt
    ? new Date(savedAt).toLocaleTimeString("es-VE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const doExportSVG = () => {
    const svg = buildSVG(nodes, edges);
    downloadBlob(svg, "flowjam.svg", "image/svg+xml;charset=utf-8");
  };

  return (
    <header className="absolute inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-[#16223A] bg-[#0F172A]/90 px-3 shadow-lg backdrop-blur md:gap-3 md:px-4">
      {/* brand */}
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-600 shadow-[0_0_18px_-2px_rgba(34,211,238,0.6)]">
          <GitBranch size={17} className="text-[#06202A]" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13.5px] leading-[17px] font-semibold tracking-tight text-slate-100">
            Flow<span className="text-cyan-400">Jam</span>
          </div>
          <div className="hidden items-center gap-1.5 text-[10.5px] leading-[13px] text-slate-500 sm:flex">
            <span>Flujo de cliente · editable</span>
            {time ? (
              <span className="inline-flex items-center gap-1 text-emerald-400/90">
                <Check size={10} /> Guardado {time}
              </span>
            ) : (
              <span className="text-amber-400/80">Autoguardado activo</span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-1 hidden h-6 w-px bg-[#1E293B] lg:block" />

      {/* history + tools (desktop) */}
      <div className="hidden items-center gap-1 lg:flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-400 hover:text-slate-100 disabled:opacity-30"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Deshacer"
            >
              <Undo2 size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Deshacer · Ctrl+Z</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-400 hover:text-slate-100 disabled:opacity-30"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Rehacer"
            >
              <Redo2 size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rehacer · Ctrl+Shift+Z</TooltipContent>
        </Tooltip>
      </div>

      <div className="ml-auto flex items-center gap-1.5 md:gap-2">
        {/* AI */}
        <Button
          size="sm"
          onClick={() => toggleAIPanel()}
          className={`h-9 gap-1.5 rounded-xl px-3 text-[12.5px] font-semibold shadow-lg transition-all ${
            aiOpen
              ? "bg-cyan-400 text-[#06202A] hover:bg-cyan-300"
              : "bg-gradient-to-r from-cyan-500 to-teal-500 text-[#06202A] hover:from-cyan-400 hover:to-teal-400"
          }`}
        >
          <Sparkles size={15} />
          <span className="hidden sm:inline">Motor IA</span>
        </Button>

        {/* export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border-[#243550] bg-transparent px-3 text-[12.5px] text-slate-300 hover:bg-white/5 hover:text-slate-100"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-[#243550] bg-[#0B1322] text-slate-200"
          >
            <DropdownMenuLabel className="text-[10.5px] tracking-wider text-slate-500 uppercase">
              Exportar diagrama
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={doExportSVG} className="gap-2.5">
              <Shapes size={14} className="text-cyan-400" />
              <div className="flex flex-col">
                <span>SVG vector · editable en FigJam</span>
                <span className="text-[10px] text-slate-500">
                  Arrástralo a FigJam y queda como vectores
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => exportPNG(buildSVG(nodes, edges))}
              className="gap-2.5"
            >
              <ImageIcon size={14} className="text-cyan-400" />
              PNG alta resolución (2x)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                downloadBlob(
                  useFlow.getState().exportJSON(),
                  "flowjam.json",
                  "application/json"
                )
              }
              className="gap-2.5"
            >
              <FileJson size={14} className="text-cyan-400" />
              JSON del proyecto (respaldo)
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#1E293B]" />
            <DropdownMenuItem
              onClick={() => fileRef.current?.click()}
              className="gap-2.5"
            >
              <Upload size={14} className="text-cyan-400" />
              Importar JSON…
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#1E293B]" />
            <DropdownMenuItem
              onClick={() => setResetting(true)}
              className="gap-2.5 text-rose-300 focus:text-rose-200"
            >
              <RotateCcw size={14} />
              Restablecer flujo original…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const text = await f.text();
            importJSON(text);
            e.target.value = "";
          }}
        />
      </div>

      {resetting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#020617]/70 backdrop-blur-sm">
          <div className="w-[320px] rounded-2xl border border-[#243550] bg-[#0B1322] p-5 shadow-2xl">
            <div className="text-[14px] font-semibold text-slate-100">
              ¿Restablecer el flujo?
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-400">
              Se descartan todos tus cambios y vuelve el flujo original de 10
              fases. Podrás deshacer con Ctrl+Z.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-200"
                onClick={() => setResetting(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-rose-500 hover:bg-rose-400"
                onClick={() => {
                  resetFlow();
                  setResetting(false);
                }}
              >
                Restablecer
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
