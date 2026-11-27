"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import FlowEditor from "@/components/flow/FlowEditor";
import { TopBar } from "@/components/flow/TopBar";
import { Toolbox } from "@/components/flow/Toolbox";
import { Inspector } from "@/components/flow/Inspector";
import { AIPanel } from "@/components/flow/AIPanel";

export default function Home() {
  return (
    <TooltipProvider delayDuration={250}>
      <main className="relative h-dvh w-full overflow-hidden bg-[#0F172A]">
        <FlowEditor />
        <TopBar />
        <Toolbox />
        <Inspector />
        <AIPanel />
      </main>
    </TooltipProvider>
  );
}
