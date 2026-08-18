function acceptedTokens(accept: string): string[] {
  return accept.split(",").map((token) => token.trim().toLowerCase()).filter(Boolean);
}

export function matchesAcceptedMimeType(mimeType: string, accept: string): boolean {
  const type = mimeType.toLowerCase();
  return acceptedTokens(accept).some((token) =>
    token === "*" ||
    (token.endsWith("/*") && type.startsWith(token.slice(0, -1))) ||
    (!token.startsWith(".") && token === type),
  );
}

export function matchesAcceptedFile(file: File, accept: string): boolean {
  const name = file.name.toLowerCase();
  return acceptedTokens(accept).some((token) =>
    token === "*" ||
    (token.endsWith("/*") && file.type.toLowerCase().startsWith(token.slice(0, -1))) ||
    (token.startsWith(".") ? name.endsWith(token) : file.type.toLowerCase() === token),
  );
}
