import type { DocumentStore } from '../src/application/ports/DocumentStore.js';
import type { SvgDocument } from '../src/domain/SvgDocument.js';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
export class MemoryDocumentStore implements DocumentStore {
  private readonly files = new Map<string, string>();
  private readonly codec = new SvgCodec();
  put(path: string, source: string): void { this.files.set(path, source); }
  get(path: string): string | undefined { return this.files.get(path); }
  async read(path: string) {
    const source = this.files.get(path);
    if (source === undefined) throw new Error(`cannot read file: ${path}`);
    return this.codec.decode(source);
  }
  async write(path: string, document: SvgDocument): Promise<void> {
    if (path === 'readonly.svg') throw new Error(`cannot write file: ${path}`);
    this.files.set(path, this.codec.encode(document));
  }
}
