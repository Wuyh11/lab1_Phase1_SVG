import { Command } from './Command.js';
import { ShapeFactory } from '../../domain/ShapeFactory.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class CreateCommand extends Command {
  constructor(private readonly type: string, private readonly id: string,
    private readonly params: readonly string[], private readonly parent?: string) { super(); }
  execute(document: SvgDocument): string {
    const shape = new ShapeFactory().create(this.type, this.id, this.params);
    document.add(shape, this.parent);
    return `${shape.tag}#${shape.id} created${this.parent === undefined ? '' : ` in g#${this.parent}`}`;
  }
}
