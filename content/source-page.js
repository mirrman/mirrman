(function startSourcePage(root) {
  const platforms = root.MirrmanSourcePlatforms;
  const commands = root.MirrmanCommands;
  if (!platforms || !commands) return;

  const resolved = platforms.resolve(location.href);
  resolved?.adapter.pageAction?.mount({
    document,
    location,
    MutationObserver,
    sendCommand: commands.send,
    window,
  });
})(globalThis);
