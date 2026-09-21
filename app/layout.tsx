import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SXRON Marketplays",
  description: "Единая торговая платформа SXRON для объявлений и полноценного маркетплейса.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}