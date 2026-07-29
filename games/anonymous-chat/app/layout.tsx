import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "匿名夜话｜局域网匿名聊天室",
  description:
    "无需账号的局域网匿名聊天室：随机代号、实时话题、共鸣回应和临时房间，消息仅保存在大厅主机内存。",
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
