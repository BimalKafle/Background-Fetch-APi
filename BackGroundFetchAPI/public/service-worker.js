self.addEventListener("install", (event) => {
  event.waitUntil(console.log("Service worker installing"));
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating.");
});

self.addEventListener("fetch", (event) => {
  console.log("This is fetch");
});

self.addEventListener("backgroundfetchsuccess", async (event) => {
  const bgFetch = event.registration;
  const records = await bgFetch.matchAll();
  for (const record of records) {
    const response = await record.responseReady;
    if (!response.ok) {
      throw new Error(`Error response status: ${response.status}`);
    }
    console.log(`File uploaded successfully: ${response.status}`);
  }
  console.log("Background fetch success:", event);
});

self.addEventListener("backgroundfetchfail", async (event) => {
  console.log("Background fetch fail:", event);
});

self.addEventListener("backgroundfetchabort", async (event) => {
  console.log("Background fetch abort:", event);
});
