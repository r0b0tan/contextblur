import { describe, it, expect } from 'vitest';
import { unescapeJsonSequences } from '../frontend/src/utils/text.js';

describe('unescapeJsonSequences', () => {
  it('returns input unchanged when no backslash present', () => {
    expect(unescapeJsonSequences('Hello World')).toBe('Hello World');
    expect(unescapeJsonSequences('')).toBe('');
    expect(unescapeJsonSequences('Keine Escapes hier.')).toBe('Keine Escapes hier.');
  });

  it('converts \\n to actual newline', () => {
    expect(unescapeJsonSequences('Hello\\nWorld')).toBe('Hello\nWorld');
    expect(unescapeJsonSequences('A\\nB\\nC')).toBe('A\nB\nC');
  });

  it('converts \\t to actual tab', () => {
    expect(unescapeJsonSequences('col1\\tcol2')).toBe('col1\tcol2');
  });

  it('converts \\r to carriage return', () => {
    expect(unescapeJsonSequences('A\\rB')).toBe('A\rB');
  });

  it('converts \\" to actual double quote', () => {
    expect(unescapeJsonSequences('Er sagte \\"Hallo\\"')).toBe('Er sagte "Hallo"');
  });

  it('converts \\\\ to single backslash', () => {
    expect(unescapeJsonSequences('C:\\\\Users\\\\test')).toBe('C:\\Users\\test');
  });

  it('handles \\\\n as backslash followed by n (not a newline)', () => {
    // \\n in JSON means literal \n (backslash + n), not a newline
    expect(unescapeJsonSequences('A\\\\nB')).toBe('A\\nB');
  });

  it('handles mixed sequences', () => {
    const input = 'Paragraph one.\\n\\nParagraph two.\\nLine with \\"quotes\\".';
    const expected = 'Paragraph one.\n\nParagraph two.\nLine with "quotes".';
    expect(unescapeJsonSequences(input)).toBe(expected);
  });

  it('preserves unknown escape sequences as-is', () => {
    // \q is not a valid JSON escape — keep backslash + char intact
    expect(unescapeJsonSequences('test\\qvalue')).toBe('test\\qvalue');
  });

  it('handles trailing backslash gracefully (no crash)', () => {
    // Lone trailing backslash — should not throw, just keep it
    const result = unescapeJsonSequences('text\\');
    expect(typeof result).toBe('string');
  });

  it('handles the Kevin text example', () => {
    const input = 'Sein Lebenssatz ist: \\"Es geht nicht darum.\\"';
    expect(unescapeJsonSequences(input)).toBe('Sein Lebenssatz ist: "Es geht nicht darum."');
  });
});
