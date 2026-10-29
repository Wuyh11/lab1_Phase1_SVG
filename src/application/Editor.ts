import { SvgDocument } from '../domain/SvgDocument.js';
import { CommandHistory } from './CommandHistory.js';
import { DocumentFormatter } from './DocumentFormatter.js';
import type { Command } from './commands/Command.js';
import type { DocumentStore } from './ports/DocumentStore.js';
export class Editor {
  private document?: SvgDocument;
  private path?: string;
  private readonly history = new CommandHistory();
  private readonly formatter = new DocumentFormatter();
  constructor(private readonly store: DocumentStore) {}
  requireDocument(): void { this.currentDocument(); }
  private currentDocument(): SvgDocument {
    if (!this.document) throw new Error("no document. use 'init' or 'read' first");
    return this.document;
  }
  init(width = 800, height = 600): string {
    const document = new SvgDocument(width, height);
    this.document = document; this.path = undefined; this.history.barrier();
    return `canvas ${width}x${height} created`;
  }
  async read(path: string): Promise<string> {
    const loaded = await this.store.read(path);
    this.document = loaded.document; this.path = path; this.history.barrier();
    return [...loaded.warnings, `read ${path} (${loaded.document.size} elements)`].join('\n');
  }
  async save(path?: string): Promise<string> {
    const document = this.currentDocument(); const target = path ?? this.path;
    if (!target) throw new Error('no file path. use save <file.svg>');
    await this.store.write(target, document);
    this.path = target; this.history.barrier(); return `saved to ${target} (${document.size} elements)`;
  }
  canvas(width?: number, height?: number): string {
    const document = this.currentDocument();
    if (width === undefined && height === undefined) return `canvas ${document.width}x${document.height}`;
    if (width === undefined || height === undefined) throw new Error('usage: canvas [w h]');
    document.resize(width, height); this.history.barrier(); return `canvas resized to ${width}x${height}`;
  }
  execute(command: Command): string {
    const result = this.history.execute(command, this.currentDocument());
    this.document = result.document; return result.message;
  }
  undo(): string { this.requireDocument(); const result = this.history.undo(); this.document = result.document; return result.message; }
  redo(): string { this.requireDocument(); const result = this.history.redo(); this.document = result.document; return result.message; }
  tree(id?: string): string { return this.formatter.tree(this.currentDocument(), id); }
  show(id: string): string { return this.formatter.show(this.currentDocument(), id); }
}
