export type NodeType = "card" | "decision" | "sticky" | "text";
export type NodeColor = "cyan" | "amber" | "emerald" | "violet" | "rose" | "slate";

export interface FlowNode {
  id: string;
  type: NodeType;
  /** world coordinates (top-left) */
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  body?: string;
  tags?: string[];
  color: NodeColor;
  /** phase number 0-10 for the badge, optional */
  phase?: number | null;
  icon?: string;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface Snapshot {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export type Tool =
  | "select"
  | "hand"
  | "card"
  | "decision"
  | "sticky"
  | "text"
  | "connect";

export type AIProvider = "builtin" | "gemini" | "groq";

export const COLORS: Record<
  NodeColor,
  { accent: string; badge: string; name: string }
> = {
  cyan: { accent: "#22D3EE", badge: "#0E7490", name: "Cian" },
  amber: { accent: "#FBBF24", badge: "#B45309", name: "Ámbar" },
  emerald: { accent: "#34D399", badge: "#047857", name: "Esmeralda" },
  violet: { accent: "#A78BFA", badge: "#6D28D9", name: "Violeta" },
  rose: { accent: "#FB7185", badge: "#BE123C", name: "Rosa" },
  slate: { accent: "#64748B", badge: "#334155", name: "Gris" },
};

export const NODE_DEFAULT_SIZES: Record<NodeType, { w: number; h: number }> = {
  card: { w: 230, h: 150 },
  decision: { w: 170, h: 130 },
  sticky: { w: 200, h: 170 },
  text: { w: 260, h: 60 },
};

/** AI operations protocol (validated client-side before applying) */
export type FlowOp =
  | {
      op: "add_node";
      node: {
        type?: string;
        title?: string;
        body?: string;
        tags?: string[];
        x?: number;
        y?: number;
        w?: number;
        h?: number;
        color?: string;
        phase?: number | null;
      };
    }
  | {
      op: "update_node";
      id: string;
      patch: {
        title?: string;
        body?: string;
        tags?: string[];
        color?: string;
        phase?: number | null;
        x?: number;
        y?: number;
      };
    }
  | { op: "delete_node"; id: string }
  | {
      op: "add_edge";
      from: string;
      to: string;
      label?: string;
      dashed?: boolean;
    }
  | {
      op: "add_sticky";
      text?: string;
      title?: string;
      x?: number;
      y?: number;
      color?: string;
    }
  | { op: "move_node"; id: string; x: number; y: number };
