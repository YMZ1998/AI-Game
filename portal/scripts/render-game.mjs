import { pathToFileURL } from "node:url";

const workerPath = process.argv[2];

if (!workerPath) {
  throw new Error("A built game worker path is required");
}

const workerUrl = pathToFileURL(workerPath);
workerUrl.searchParams.set("render", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const handler = typeof worker === "function" ? worker : worker.fetch.bind(worker);
const response = await handler(
  new Request("http://playroom.local/", {
    headers: { accept: "text/html" },
  }),
  {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  },
  {
    waitUntil() {},
    passThroughOnException() {},
  },
);

if (!response.ok) {
  throw new Error(`Game rendered with HTTP ${response.status}`);
}

process.stdout.write(await response.text());
