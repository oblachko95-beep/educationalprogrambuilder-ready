import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Конструктор образовательных программ",
  description: "Личный кабинет для подготовки программ ДООП, повышения квалификации и профессиональной переподготовки.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body className="antialiased">{children}</body></html>;
}
