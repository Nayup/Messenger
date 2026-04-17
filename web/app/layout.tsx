import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Messenger Clone",
  description: "Real-time chat app - Ứng dụng nhắn tin thời gian thực",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        {children}
        <Toaster
          position="top-center"
          theme="dark"
          toastOptions={{
            style: {
              background: 'rgba(39, 39, 42, 0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e4e4e7',
              backdropFilter: 'blur(12px)',
            },
          }}
        />
      </body>
    </html>
  );
}