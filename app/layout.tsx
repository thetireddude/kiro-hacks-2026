import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New News",
  description: "Your source for the latest stories.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
