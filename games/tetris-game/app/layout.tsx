import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "堆叠实验室｜AI 俄罗斯方块",
  description:
    "由 LoveDaisy/tetris_game 移植而来的网页版俄罗斯方块，支持手动操作、AI 自动落子与实时决策遥测。",
  openGraph: {
    title: "堆叠实验室｜AI 俄罗斯方块",
    description:
      "经典手动俄罗斯方块与两步前瞻 AI 自动落子，在浏览器里查看每一次决策。",
    type: "website",
    locale: "zh_CN",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "堆叠实验室｜AI 俄罗斯方块",
    description: "手动堆叠或交给 AI，并实时查看目标列、旋转与棋盘评分。",
    images: ["/og.png"],
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
