import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { TRPCReactProvider } from "@/trpc/react";
import { AppLayout } from "@features/shared/layout/app-layout";
import { SidebarProvider } from "@features/shared/layout/sidebar-context";
import { ThemeProvider } from "@features/shared/theme";

export const metadata: Metadata = {
  title: "Red Team Assessment Platform (RTAP)",
  description: "Red Team reporting and analytics platform",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={geist.variable}>
      <body>
        <ThemeProvider defaultTheme="theme-modern-teal">
          <TRPCReactProvider>
            <SessionProvider>
              <SidebarProvider>
                <AppLayout>
                  <main className="min-h-screen">{children}</main>
                </AppLayout>
              </SidebarProvider>
            </SessionProvider>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
