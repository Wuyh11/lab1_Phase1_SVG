import { readFile, writeFile, rename, unlink, stat } from 'node:fs/promises';
import { dirname, basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DocumentStore } from '../application/ports/DocumentStore.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { SvgCodec } from './SvgCodec.js';

export class LocalDocumentStore implements DocumentStore {
  private readonly codec = new SvgCodec();
  async read(path: string): Promise<{ document: SvgDocument; warnings: readonly string[] }> {
    let source: string;
    try { source = await readFile(path, 'utf8'); }
    catch { throw new Error(`cannot read file: ${path}`); }
    return this.codec.decode(source);
  }
  async write(path: string, document: SvgDocument): Promise<void> {
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    try {
      // Retain existing file permissions and refuse explicitly read-only targets.
      const existing = await stat(path).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return undefined;
        throw error;
      });
      if (existing && (!existing.isFile() || (existing.mode & 0o222) === 0)) throw new Error('target is not writable');
      await writeFile(temporary, this.codec.encode(document), { encoding: 'utf8', flag: 'wx', mode: existing?.mode ?? 0o666 });
      await rename(temporary, path);
    } catch {
      await unlink(temporary).catch(() => undefined);
      throw new Error(`cannot write file: ${path}`);
    }
  }
}
