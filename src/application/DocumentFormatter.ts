import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
export class DocumentFormatter {
  tree(document: SvgDocument, id?: string): string {
    if (id !== undefined) {
      const shape = document.find(id);
      return [this.summary(shape), ...this.branches(shape.children, '')].join('\n');
    }
    return [`svg (${document.width}x${document.height})`, ...this.branches(document.children, '')].join('\n');
  }
  show(document: SvgDocument, id: string): string {
    const shape = document.find(id); const parent = document.parentOf(shape);
    const attrs = [...shape.getAttributes()].map(([key, value]) => `${key}=${this.safe(value)}`);
    if (shape.textContent !== undefined) attrs.push(`text=${JSON.stringify(shape.textContent)}`);
    if (shape.isContainer) attrs.push(`children=${shape.children.length}`);
    return `${shape.tag}#${shape.id}  parent=${parent.id ? `g#${parent.id}` : 'svg'}\n  ${attrs.join(' ')}`;
  }
  private summary(shape: Shape): string {
    const attrs = [...shape.getAttributes()].map(([key, value]) => `${key === 'width' ? 'w' : key === 'height' ? 'h' : key}=${this.safe(value)}`);
    if (shape.textContent !== undefined) attrs.push(JSON.stringify(shape.textContent));
    return `${shape.tag}#${shape.id}${attrs.length ? `  ${attrs.join(' ')}` : ''}`;
  }
  private safe(value: string): string { return /[\s\x00-\x1f]/u.test(value) ? JSON.stringify(value) : value; }
  private branches(shapes: readonly Shape[], prefix: string): string[] {
    return shapes.flatMap((shape, index) => {
      const last = index === shapes.length - 1;
      return [`${prefix}${last ? '└── ' : '├── '}${this.summary(shape)}`,
        ...this.branches(shape.children, `${prefix}${last ? '    ' : '│   '}`)];
    });
  }
}
