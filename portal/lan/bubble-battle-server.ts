import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

export const BUBBLE_BATTLE_INTERNAL_PORT = 3012;

export function bubbleBattleServer(): Plugin {
  let child: ChildProcess | null = null;

  return {
    name: "playroom-bubble-battle-service",
    apply: "serve",
    configureServer(server) {
      const serverFile = path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "games",
        "bubble-battle",
        "server.mjs",
      );

      if (!existsSync(serverFile)) {
        throw new Error(`Bubble Battle server is missing: ${serverFile}`);
      }

      child = spawn(process.execPath, [serverFile], {
        cwd: path.dirname(serverFile),
        env: {
          ...process.env,
          NODE_ENV: "production",
          PORT: String(BUBBLE_BATTLE_INTERNAL_PORT),
        },
        stdio: "inherit",
        windowsHide: true,
      });

      child.on("exit", (code, signal) => {
        if (code && code !== 0) {
          console.warn(
            `[bubble-battle] local service exited (${signal ?? code})`,
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
