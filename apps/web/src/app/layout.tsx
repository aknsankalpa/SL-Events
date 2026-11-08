import type { Metadata, Viewport } from "next";
import { Cinzel, Montserrat } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "SL Events — Sri Lankan events in Korea",
    template: "%s · SL Events",
  },
  description:
    "Discover, book and walk in with a QR pass. Sri Lankan events and entertainment across Korea.",
};

/**
 * Start at the phone's width and never zoom in on its own: iPhone Safari zooms into small text boxes and doesn't zoom
 * back out, leaving the page draggable left and right. iOS still lets people pinch to zoom (it ignores the maximum for
 * accessibility); this only stops the automatic zoom.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cinzel.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
