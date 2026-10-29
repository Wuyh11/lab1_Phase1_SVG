import type { SvgDocument } from '../../domain/SvgDocument.js';
export interface DocumentStore {
  read(path: string): Promise<{ document: SvgDocument; warnings: readonly string[] }>;
  write(path: string, document: SvgDocument): Promise<void>;
}
