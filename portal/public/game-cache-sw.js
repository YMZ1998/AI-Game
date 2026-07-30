const CACHE_PREFIX = "playroom-game-assets-";
const CACHE_NAME = `${CACHE_PREFIX}v2`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function canCache(response) {
  return response && response.ok && response.type === "basic";
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (canCache(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const update = fetch(request).then(async (response) => {
    if (canCache(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  });

  if (cached) {
    update.catch(() => {});
    return cached;
  }
  return update;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/embedded/")) {
    return;
  }

  const fastDestinations = new Set([
    "audio",
    "font",
    "image",
    "video",
  ]);
  const strategy = fastDestinations.has(request.destination)
    ? staleWhileRevalidate
    : networkFirst;

  event.respondWith(strategy(request));
});
