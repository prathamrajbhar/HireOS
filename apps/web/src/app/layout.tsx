import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import RoleSwitcher from "@/components/RoleSwitcher";
import { ToastProvider } from "@/contexts/ToastContext";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HireOS — AI-Native Recruitment Marketplace",
  description: "Build hiring pipelines, run voice AI interviews, and get structured bias-audited recruitment shortlists with HireOS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="min-h-full flex flex-col bg-transparent text-slate-900 font-sans selection:bg-indigo-500 selection:text-white relative">
        {/* Decorative Background Blobs */}
        <div className="blob-container">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>

        <ToastProvider>
          {/* Page Content */}
          <main className="flex-grow flex flex-col">{children}</main>

          {/* Global Developer/Reviewer Menu */}
          <RoleSwitcher />
        </ToastProvider>
      </body>
    </html>
  );
}
