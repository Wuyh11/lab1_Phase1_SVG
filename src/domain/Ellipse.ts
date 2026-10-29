import { Shape } from './Shape.js';
export class Ellipse extends Shape {
  constructor(id: string) { super(id); this.initializeGeometry(); }
  get tag(): string { return 'ellipse'; }
  protected get geometry(): readonly string[] { return ['cx', 'cy', 'rx', 'ry']; }
  protected get horizontal(): readonly string[] { return ['cx']; }
  protected get vertical(): readonly string[] { return ['cy']; }
  protected blank(): Ellipse { return new Ellipse(this.id); }
}
