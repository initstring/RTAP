import "@/styles/globals.css";

import { type Metadata } from "next";
import { SessionProvider } from "next-auth/react";

import { TRPCReactProvider } from "@/trpc/react";
import { AppLayout } from "@features/shared/layout/app-layout";
import { SidebarProvider } from "@features/shared/layout/sidebar-context";

export const metadata: Metadata = {
  title: "Red Team Assessment Platform (RTAP)",
  description: "Red Team reporting and analytics platform",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};


import { ThemeProvider } from "next-themes";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
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
