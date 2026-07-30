import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

export const MICRO_RACING_INTERNAL_PORT = 3009;

export function microRacingLanServer(): Plugin {
  let child: ChildProcess | null = null;

  return {
    name: "playroom-micro-racing-service",
    apply: "serve",
    configureServer(server) {
      const serverFile = path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "games",
        "micro-racing",
        "server",
        "server.js",
      );

      if (!existsSync(serverFile)) {
        throw new Error(
          `Micro Racing local server bundle is missing: ${serverFile}`,
        );
      }

      child = spawn(process.execPath, [serverFile], {
        cwd: path.dirname(serverFile),
        env: {
          ...process.env,
          NODE_ENV: "production",
          PORT: String(MICRO_RACING_INTERNAL_PORT),
        },
        stdio: "inherit",
        windowsHide: true,
      });

      child.on("exit", (code, signal) => {
        if (code && code !== 0) {
          console.warn(
            `[micro-racing] local service exited (${signal ?? code})`,
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
