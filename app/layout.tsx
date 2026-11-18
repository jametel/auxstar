import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auxstar",
  description: "Add a song and pass the auxstar on.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <a href="/">Auxstar</a>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
