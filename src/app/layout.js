import { Providers } from "@/components/Providers";
import "./globals.css";
import localFont from "next/font/local";
import { getSessionUser } from "@/lib/helpers/auth";

export const metadata = {
  title: "Milkywayy - Dubai's 1st Property Shoot Booking Portal",
  description: "Elevate your real estate listings with Dubai's premier property photography and videography booking platform. Seamless, professional, and out of this world.",
  icons: {
    icon: '/logo-sm.png',
  },
};

export const poppins = localFont({
  variable: "--font-poppins",
  src: "../fonts/Poppins/Poppins-Regular.ttf",
});

export const spaceGrotesk = localFont({
  variable: "--font-space-grotesk",
  src: "../fonts/Space_Grotesk/SpaceGrotesk-VariableFont_wght.ttf",
});

export default async function RootLayout({ children }) {
  const user = await getSessionUser();

  return (
    <html lang="en">
      <body className={`${poppins.className} ${spaceGrotesk.variable} antialiased`}>
        {/* <div>Failed!!</div> */}
        <Providers user={user}>{children}</Providers>
      </body>
    </html>
  );
}
