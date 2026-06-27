export function includesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

export function normalizeIdentifier(value: string, options: { lowercase?: boolean } = {}): string {
  const identifier = value
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return options.lowercase ? identifier.toLowerCase() : identifier;
}

export function matchesNormalizedName(value: string, names: readonly string[]): boolean {
  const normalizedValue = normalizeComparableName(value);

  return names.some((name) => normalizeComparableName(name) === normalizedValue);
}

function normalizeComparableName(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}
