import type { Metadata } from "next";
import { Poppins, Fjalla_One, Playwrite_CA } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--poppins",
  subsets: ["latin"],
  weight: ["400"],
});

const fjallaOne = Fjalla_One({
  variable: "--fjalla-one",
  subsets: ["latin"],
  weight: ["400"],
});
const playwrite = Playwrite_CA({
  variable: "--playwrite",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Cinder",
  description: "An online ticketing site",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${fjallaOne.variable} ${playwrite.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
