import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

export const TOSIOS_INTERNAL_PORT = 3008;

export function tosiosLanServer(): Plugin {
  let child: ChildProcess | null = null;

  return {
    name: "playroom-tosios-lan",
    apply: "serve",
    configureServer(server) {
      const serverFile = path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "games",
        "tosios",
        "server",
        "tosios-server.cjs",
      );

      if (!existsSync(serverFile)) {
        throw new Error(
          `TOSIOS local server bundle is missing: ${serverFile}`,
        );
      }

      child = spawn(process.execPath, [serverFile], {
        cwd: path.dirname(serverFile),
        env: {
          ...process.env,
          PORT: String(TOSIOS_INTERNAL_PORT),
        },
        stdio: "inherit",
        windowsHide: true,
      });

      child.on("exit", (code, signal) => {
        if (code && code !== 0) {
          console.warn(
            `[tosios] local room server exited (${signal ?? code})`,
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
