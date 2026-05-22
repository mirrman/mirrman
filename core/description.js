export function buildDescription(
  strategy,
  sourceUrl,
  originalDescription = "",
) {
  if (strategy === "original") return originalDescription || "";
  if (strategy === "empty") return "";

  const prefix = `[本仓库镜像自 ${sourceUrl}]`;
  return [prefix, originalDescription || ""].filter(Boolean).join(" — ");
}
