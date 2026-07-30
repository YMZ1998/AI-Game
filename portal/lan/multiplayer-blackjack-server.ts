import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

export const MULTIPLAYER_BLACKJACK_INTERNAL_PORT = 3011;

export function multiplayerBlackjackServer(): Plugin {
  let child: ChildProcess | null = null;

  return {
    name: "playroom-multiplayer-blackjack-service",
    apply: "serve",
    configureServer(server) {
      const serverFile = path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "games",
        "multiplayer-blackjack",
        "server.js",
      );

      if (!existsSync(serverFile)) {
        throw new Error(
          `Multiplayer Blackjack server is missing: ${serverFile}`,
        );
      }

      child = spawn(process.execPath, [serverFile], {
        cwd: path.dirname(serverFile),
        env: {
          ...process.env,
          NODE_ENV: "production",
          PORT: String(MULTIPLAYER_BLACKJACK_INTERNAL_PORT),
        },
        stdio: "inherit",
        windowsHide: true,
      });

      child.on("exit", (code, signal) => {
        if (code && code !== 0) {
          console.warn(
            `[multiplayer-blackjack] local service exited (${signal ?? code})`,
          );
        }
        child = null;
      });

      server.httpServer?.once("close", () => {
        child?.kill();
        child = null;
      });
    },
  };
}
