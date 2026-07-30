import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proofmark | Alcohol Label Review",
  description: "AI-assisted alcohol label verification for compliance agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
