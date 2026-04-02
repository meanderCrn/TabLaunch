// Shared storage helper — tries storage.sync, falls back to storage.local per call
const store = (() => {
  async function get(key) {
    try {
      return await browser.storage.sync.get(key);
    } catch (e) {
      console.warn("storage.sync failed, falling back to storage.local:", e);
      return await browser.storage.local.get(key);
    }
  }

  async function set(data) {
    try {
      return await browser.storage.sync.set(data);
    } catch (e) {
      console.warn("storage.sync failed, falling back to storage.local:", e);
      return await browser.storage.local.set(data);
    }
  }

  function area() {
    return "sync";
  }

  return { get, set, area };
})();
