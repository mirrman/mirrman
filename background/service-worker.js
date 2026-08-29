import { createCommandHandler } from "./commands.js";
import "../shared/web-extension.js";

const webExtension = globalThis.MirrmanWebExtension;

const handleCommand = createCommandHandler({
  openOptionsPage: () => webExtension.openOptionsPage(),
});

webExtension.addMessageListener((message, sender, sendResponse) => {
  handleCommand(message, sender)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: {
          code: error?.code || "UNEXPECTED_ERROR",
          message: error?.message || String(error),
        },
      }),
    );
  return true;
});
