import { getSettings } from "../core/storage.js";
import { runMirror } from "../core/mirror.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "RUN_MIRROR") return;

  (async () => {
    try {
      const settings = await getSettings();
      const result = await runMirror(message.payload || {}, settings);
      sendResponse({ ok: true, data: result });
    } catch (error) {
      sendResponse({
        ok: false,
        error: { message: error?.message || String(error) },
      });
    }
  })();

  return true;
});
