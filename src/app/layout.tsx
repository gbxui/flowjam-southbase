import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlowJam · Editor de flujo con IA",
  description:
    "Editor visual estilo FigJam para diagramas de flujo: tarjetas editables, conector, y motor IA multi-modelo (GLM, Gemini, Groq) que edita el diagrama por ti.",
  keywords: [
    "FlowJam",
    "editor de flujos",
    "FigJam",
    "diagrama de flujo",
    "IA",
    "Gemini",
    "Groq",
  ],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "FlowJam",
    description: "Editor visual de diagramas de flujo con motor IA multi-modelo",
    siteName: "FlowJam",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#0F172A] text-foreground antialiased`}
      >
        {children}
        <Toaster theme="dark" position="bottom-center" />
      </body>
    </html>
  );
}
