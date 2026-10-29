import type { Shape } from '../domain/Shape.js';
import { Shape as Numeric } from '../domain/Shape.js';

/** Positive uniform scale + translate can be baked into every supported geometry. */
export class SvgTransform {
  private scale = 1;
  private dx = 0;
  private dy = 0;
  constructor(source: string) {
    const expression = /([A-Za-z]+)\s*\(([^)]*)\)/g;
    let end = 0;
    for (const match of source.matchAll(expression)) {
      if (!/^[\s,]*$/.test(source.slice(end, match.index))) throw new Error('invalid SVG transform');
      const args = match[2]!.trim().split(/[\s,]+/).filter(Boolean).map(value => Numeric.number(value));
      const name = match[1]!;
      // This is syntax parsing, not shape-type dispatch. Unsupported transforms are
      // rejected instead of silently changing imported geometry.
      if (name === 'translate' && args.length >= 1 && args.length <= 2) {
        this.dx += this.scale * args[0]!; this.dy += this.scale * (args[1] ?? 0);
      } else if (name === 'scale' && args.length >= 1 && args.length <= 2 && (args[1] ?? args[0]) === args[0] && args[0]! > 0) {
        this.scale *= args[0]!;
      } else throw new Error(`unsupported SVG transform: ${name} (only translate and positive uniform scale)`);
      end = match.index! + match[0].length;
    }
    if (!/^[\s,]*$/.test(source.slice(end))) throw new Error('invalid SVG transform');
    if (![this.scale, this.dx, this.dy].every(Number.isFinite)) throw new Error('invalid SVG transform');
  }
  apply(shape: Shape): void { shape.scale(this.scale); shape.move(this.dx, this.dy); }
}
