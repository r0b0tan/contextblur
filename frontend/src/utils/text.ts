// Unescape JSON-style escape sequences that users sometimes paste from
// API responses or JSON viewers (\n → newline, \" → ", \\ → \, etc.).
// Returns the input unchanged if it contains no backslashes.
export function unescapeJsonSequences(s: string): string {
  if (!s.includes('\\')) return s;
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const next = s[i + 1];
      if      (next === 'n')  { out += '\n'; i += 2; }
      else if (next === 't')  { out += '\t'; i += 2; }
      else if (next === 'r')  { out += '\r'; i += 2; }
      else if (next === '"')  { out += '"';  i += 2; }
      else if (next === '\\') { out += '\\'; i += 2; }
      else                    { out += s[i]; i++;     } // unknown escape — keep as-is
    } else {
      out += s[i]; i++;
    }
  }
  return out;
}
