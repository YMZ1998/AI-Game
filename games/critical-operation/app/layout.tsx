import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "临界行动｜第一人称反恐射击",
  description:
    "原创浏览器第一人称战术射击游戏：突入港口仓库、消灭敌方机器人并在倒计时结束前拆除装置。",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
