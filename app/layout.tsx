
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Talent Link | Unlocking Displaced Talent",
  description:
    "Talent Link connects skilled refugees with employment opportunities, professional mentorship, skills recognition and global professional networks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
