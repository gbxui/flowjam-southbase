"use client";

import { useState } from "react";
import { Copy, Link2, Split, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useFlow } from "@/lib/flow/store";
import { COLORS } from "@/lib/flow/types";
import type { FlowEdge, FlowNode, NodeColor } from "@/lib/flow/types";

const panelPos = (aiOpen: boolean) =>
  aiOpen ? "right-[400px] max-lg:right-4" : "right-4";

export function Inspector() {
  const selection = useFlow((s) => s.selection);
  const nodes = useFlow((s) => s.nodes);
  const edges = useFlow((s) => s.edges);
  const aiOpen = useFlow((s) => s.aiPanelOpen);
  const tool = useFlow((s) => s.tool);

  const node =
    selection.nodes.length === 1
      ? nodes.find((n) => n.id === selection.nodes[0])
      : undefined;
  const edge =
    selection.edges.length === 1
      ? edges.find((e) => e.id === selection.edges[0])
      : undefined;

  if ((!selection.nodes.length && !selection.edges.length) || tool === "connect")
    return null;

  const close = () => useFlow.getState().clearSelection();

  // ── edge inspector ───────────────────────────────────────────
  if (edge) {
    return <EdgeForm key={edge.id} edge={edge} aiOpen={aiOpen} onClose={close} />;
  }

  // ── multi selection ─────────────────────────────────────────
  if (selection.nodes.length > 1) {
    return (
      <aside
        className={`absolute top-16 z-30 w-[272px] rounded-2xl border border-[#1E293B] bg-[#0B1322]/95 p-4 shadow-2xl backdrop-blur ${panelPos(aiOpen)}`}
      >
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-medium text-slate-200">
            {selection.nodes.length} tarjetas seleccionadas
          </div>
          <button
            onClick={close}
            aria-label="Cerrar"
            className="text-slate-500 hover:text-slate-200"
          >
            <X size={15} />
          </button>
        </div>
        <div className="mt-3.5 flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => useFlow.getState().duplicateSelection()}
              className="flex-1 gap-1.5 bg-[#1E293B] text-[12px] text-slate-200 hover:bg-[#26334A]"
            >
              <Copy size={13} /> Duplicar
            </Button>
            <Button
              size="sm"
              onClick={() => useFlow.getState().deleteSelection()}
              className="flex-1 gap-1.5 bg-rose-500/90 text-[12px] text-white hover:bg-rose-500"
            >
              <Trash2 size={13} /> Eliminar
            </Button>
          </div>
          <p className="text-[10.5px] leading-relaxed text-slate-500">
            Arrastra para moverlas juntas. Shift+clic para añadir o quitar de la selección.
          </p>
        </div>
      </aside>
    );
  }

  if (!node) return null;
  return (
    <NodeForm
      key={node.id}
      node={node}
      aiOpen={aiOpen}
      onClose={close}
    />
  );
}

/* ═════════════════════════ EDGE FORM ═════════════════════════ */

function EdgeForm({
  edge,
  aiOpen,
  onClose,
}: {
  edge: FlowEdge;
  aiOpen: boolean;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(edge.label ?? "");
  const [dashed, setDashed] = useState(edge.dashed ?? false);
  const updateEdge = useFlow((s) => s.updateEdge);

  return (
    <aside
      className={`absolute top-16 z-30 w-[272px] rounded-2xl border border-[#1E293B] bg-[#0B1322]/95 p-4 shadow-2xl backdrop-blur ${panelPos(aiOpen)}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-medium tracking-wider text-slate-500 uppercase">
          <Link2 size={13} className="text-cyan-400" /> Conexión
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="text-slate-500 hover:text-slate-200"
        >
          <X size={15} />
        </button>
      </div>
      <div className="mt-3.5 space-y-3.5">
        <div>
          <Label className="text-[11px] text-slate-400">Etiqueta</Label>
          <Input
            value={label}
            onFocus={() => useFlow.getState().beginInteraction()}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => {
              useFlow.getState().updateEdge(edge.id, {
                label: label.trim() || undefined,
              });
              useFlow.getState().endInteraction();
            }}
            placeholder="ej. sí / no / cada avance"
            className="mt-1.5 h-9 border-[#243550] bg-[#0F172A] text-[12.5px] text-slate-200"
          />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[#1E293B] bg-[#0F172A] px-3 py-2.5">
          <div>
            <div className="text-[12px] font-medium text-slate-200">Línea punteada</div>
            <div className="text-[10.5px] text-slate-500">Para flujos de retorno</div>
          </div>
          <Switch
            checked={dashed}
            onCheckedChange={(v) => {
              useFlow.getState().pushHistory();
              setDashed(v);
              updateEdge(edge.id, { dashed: v });
            }}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => useFlow.getState().deleteSelection()}
          className="w-full gap-2 border-[#3B2030] bg-transparent text-[12px] text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10"
        >
          <Trash2 size={13} /> Eliminar conexión
        </Button>
      </div>
    </aside>
  );
}

/* ═════════════════════════ NODE FORM ═════════════════════════ */

function NodeForm({
  node,
  aiOpen,
  onClose,
}: {
  node: FlowNode;
  aiOpen: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(node.title);
  const [body, setBody] = useState(node.body ?? "");
  const [tagInput, setTagInput] = useState("");

  const update = (patch: Partial<FlowNode>) =>
    useFlow.getState().updateNode(node.id, patch);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    const tags = [...(node.tags ?? [])];
    if (!tags.includes(t) && tags.length < 6) {
      useFlow.getState().pushHistory();
      update({ tags: [...tags, t] });
    }
    setTagInput("");
  };

  return (
    <aside
      className={`absolute top-16 z-30 max-h-[calc(100dvh-96px)] w-[272px] overflow-y-auto rounded-2xl border border-[#1E293B] bg-[#0B1322]/95 p-4 shadow-2xl backdrop-blur ${panelPos(aiOpen)}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-medium tracking-wider text-slate-500 uppercase">
          <Split size={13} className="text-cyan-400" />
          {node.type === "card"
            ? "Tarjeta"
            : node.type === "decision"
              ? "Decisión"
              : node.type === "sticky"
                ? "Nota"
                : "Texto"}
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="text-slate-500 hover:text-slate-200"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3.5 space-y-3.5">
        {node.type !== "sticky" && (
          <div>
            <Label className="text-[11px] text-slate-400">Título</Label>
            <Input
              value={title}
              onFocus={() => useFlow.getState().beginInteraction()}
              onChange={(e) => {
                setTitle(e.target.value);
                update({ title: e.target.value });
              }}
              onBlur={() => useFlow.getState().endInteraction()}
              className="mt-1.5 h-9 border-[#243550] bg-[#0F172A] text-[12.5px] font-medium text-slate-200"
            />
          </div>
        )}

        <div>
          <Label className="text-[11px] text-slate-400">
            {node.type === "sticky" ? "Texto de la nota" : "Descripción"}
          </Label>
          <Textarea
            value={body}
            onFocus={() => useFlow.getState().beginInteraction()}
            onChange={(e) => {
              setBody(e.target.value);
              update({ body: e.target.value });
            }}
            onBlur={() => useFlow.getState().endInteraction()}
            rows={node.type === "sticky" ? 5 : 4}
            placeholder="Detalle visible dentro de la tarjeta…"
            className="mt-1.5 resize-none border-[#243550] bg-[#0F172A] text-[12px] leading-relaxed text-slate-300"
          />
        </div>

        {node.type !== "text" && (
          <div>
            <Label className="text-[11px] text-slate-400">
              Etiquetas {node.tags?.length ? `(${node.tags.length}/6)` : ""}
            </Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(node.tags ?? []).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full border border-[#243550] bg-[#0F172A] py-[3px] pr-1.5 pl-2.5 text-[10.5px] text-cyan-300"
                >
                  {t}
                  <button
                    onClick={() => {
                      useFlow.getState().pushHistory();
                      update({ tags: node.tags!.filter((x) => x !== t) });
                    }}
                    className="text-slate-500 hover:text-rose-300"
                    aria-label={`Quitar ${t}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
              placeholder="Añadir y Enter…"
              className="mt-1.5 h-8 border-[#243550] bg-[#0F172A] text-[11.5px] text-slate-300"
            />
          </div>
        )}

        <div>
          <Label className="text-[11px] text-slate-400">Color</Label>
          <div className="mt-1.5 flex gap-2">
            {(Object.keys(COLORS) as NodeColor[]).map((c) => (
              <button
                key={c}
                onClick={() => {
                  useFlow.getState().pushHistory();
                  update({ color: c });
                }}
                aria-label={`Color ${COLORS[c].name}`}
                title={COLORS[c].name}
                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 ${
                  node.color === c ? "border-slate-100" : "border-transparent"
                }`}
                style={{ background: COLORS[c].accent }}
              />
            ))}
          </div>
        </div>

        {node.type === "card" && (
          <div>
            <Label className="text-[11px] text-slate-400">Fase (0–10 · opcional)</Label>
            <Input
              type="number"
              min={0}
              max={99}
              value={node.phase ?? ""}
              onFocus={() => useFlow.getState().beginInteraction()}
              onChange={(e) =>
                update({
                  phase:
                    e.target.value === ""
                      ? null
                      : Math.max(0, Math.min(99, Number(e.target.value))),
                })
              }
              onBlur={() => useFlow.getState().endInteraction()}
              placeholder="—"
              className="mt-1.5 h-9 border-[#243550] bg-[#0F172A] text-[12.5px] text-slate-200"
            />
          </div>
        )}

        <div className="flex gap-2 pt-0.5">
          <Button
            size="sm"
            onClick={() => useFlow.getState().duplicateSelection()}
            className="flex-1 gap-1.5 bg-[#1E293B] text-[12px] text-slate-200 hover:bg-[#26334A]"
          >
            <Copy size={13} /> Duplicar
          </Button>
          <Button
            size="sm"
            onClick={() => useFlow.getState().deleteSelection()}
            className="flex-1 gap-1.5 bg-rose-500/90 text-[12px] text-white hover:bg-rose-500"
          >
            <Trash2 size={13} /> Eliminar
          </Button>
        </div>
      </div>
    </aside>
  );
}
