import { Providers } from "@/components/Providers";
import "./globals.css";
import localFont from "next/font/local";
import { getSessionUser } from "@/lib/helpers/auth";

export const metadata = {
  title: "Milkywayy - Don’t Just List, Dominate.",
  description:
    "Dubai's first structured real estate media booking system - book photography, video walkthroughs, and 360° tours in seconds, then manage listings and invoices from one powerful dashboard.",
  icons: {
    icon: [
      {
        url: "/milkywayy-web-icon.jpeg",
        type: "image/jpeg",
        sizes: "512x512",
      },
    ],
    shortcut: [
      {
        url: "/milkywayy-web-icon.jpeg",
        type: "image/jpeg",
        sizes: "512x512",
      },
    ],
    apple: [
      {
        url: "/milkywayy-web-icon.jpeg",
        type: "image/jpeg",
        sizes: "512x512",
      },
    ],
  },
};

export const spaceGrotesk = localFont({
  variable: "--font-space-grotesk",
  src: "../fonts/Space_Grotesk/SpaceGrotesk-VariableFont_wght.ttf",
});

export default async function RootLayout({ children }) {
  const user = await getSessionUser();

  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} antialiased`}>
        {/* <div>Failed!!</div> */}
        <Providers user={user}>{children}</Providers>
      </body>
    </html>
  );
}
