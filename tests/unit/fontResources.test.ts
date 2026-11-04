import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
describe('local font binary identity and distribution contract', () => {
  it('ships pinned originals with matching licenses, weight axes and Unicode coverage', () => {
    const manifest = JSON.parse(readFileSync(resolve('public/fonts/sources.json'), 'utf8'));
    expect(manifest.repository).toBe('https://github.com/google/fonts');
    expect(manifest.revision).toMatch(/^[a-f0-9]{40}$/);
    expect(manifest.fonts.map((f: any) => f.family).sort()).toEqual(['Orbitron', 'Outfit']);
    for (const font of manifest.fonts) {
      const binary = readFileSync(resolve('public/fonts', font.file));
      expect(binary.length).toBe(font.byteSize); expect(hash(binary)).toBe(font.sha256);
      expect(font.sourceSha256).toBe(font.sha256); expect(font.transformation).toBe('none');
      expect(font.upstreamURL).toContain('/' + manifest.revision + '/ofl/');
      const license = readFileSync(resolve('public/fonts', font.licensePath));
      expect(hash(Buffer.from(license.toString('utf8').replace(/\r\n/g, '\n')))).toBe(font.licenseSha256);
      const metadata = readFileSync(resolve('public/fonts', font.metadataPath), 'utf8').replace(/\r\n/g, '\n');
      expect(hash(Buffer.from(metadata))).toBe(font.metadataSha256);
      expect(metadata).toContain(font.copyright);
      expect(metadata).toContain('name: "' + font.family + '"');
      expect(license.toString()).toContain('SIL OPEN FONT LICENSE Version 1.1');
      expect(license.toString()).toContain(font.copyright);
      const count = binary.readUInt16BE(4); const tables: Record<string, number> = {};
      for (let i = 0; i < count; i++) { const at = 12 + 16 * i; tables[binary.toString('ascii', at, at + 4)] = binary.readUInt32BE(at + 8); }
      expect(tables.cmap).toBeGreaterThan(0); expect(tables.name).toBeGreaterThan(0);
      const fvar = tables.fvar; expect(fvar).toBeGreaterThan(0);
      const axis = fvar + binary.readUInt16BE(fvar + 4);
      expect(binary.toString('ascii', axis, axis + 4)).toBe('wght');
      const minimum = binary.readInt32BE(axis + 4) / 65536, maximum = binary.readInt32BE(axis + 12) / 65536;
      expect([minimum, maximum]).toEqual(font.weightRange);
      for (const weight of font.requiredWeights) expect(weight >= minimum && weight <= maximum).toBe(true);
      expect(font.unicodeRanges.some((range: number[]) => range[0] <= 65 && range[1] >= 90)).toBe(true);
      expect(font.unicodeRanges.some((range: number[]) => range[0] <= 48 && range[1] >= 57)).toBe(true);
    }
  });
});
