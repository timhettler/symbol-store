import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Container, Grid, Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import styles from "./page.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Symbol Store",
  description: "Combine SVGs into a single file with Symbol definitions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Theme>
          <Container style={{ background: "var(--gray-a2)" }}>
            <Grid
              gap="3"
              rows="20px 1fr 20px"
              align="center"
              justify="center"
              minHeight="100svh"
              style={{ background: "white" }}
              p={{ initial: "3", md: "6" }}
            >
              <main className={styles.main}>{children}</main>
            </Grid>
          </Container>
        </Theme>
      </body>
    </html>
  );
}
