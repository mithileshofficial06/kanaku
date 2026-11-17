import type { Metadata } from "next";
import { Anton, Fraunces, Geist_Mono, Inter_Tight } from "next/font/google";
import "./globals.css";
import Preloader from "@/components/Preloader";

const display = Anton({ variable: "--nf-display", weight: "400", subsets: ["latin"] });
const serif = Fraunces({ variable: "--nf-serif", subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"] });
const body = Inter_Tight({ variable: "--nf-body", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--nf-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kanaku | AI credit underwriter for Indian small businesses",
  description: "Underwrite a small-business loan in a minute. Every number with proof, every no with a path to yes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${serif.variable} ${body.variable} ${mono.variable} antialiased`}><Preloader />{children}</body>
    </html>
  );
}
