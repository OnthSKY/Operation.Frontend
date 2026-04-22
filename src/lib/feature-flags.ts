export function isFeatureEnabled(flag?: string): boolean {
  if (!flag || flag.trim() === "") return true;
  const env = process.env.NEXT_PUBLIC_FEATURE_FLAGS ?? "";
  const enabled = env
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return enabled.includes(flag);
}
