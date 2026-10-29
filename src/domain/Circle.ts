import { Shape } from './Shape.js';
export class Circle extends Shape {
  constructor(id: string) { super(id); this.initializeGeometry(); }
  get tag(): string { return 'circle'; }
  protected get geometry(): readonly string[] { return ['cx', 'cy', 'r']; }
  protected get horizontal(): readonly string[] { return ['cx']; }
  protected get vertical(): readonly string[] { return ['cy']; }
  protected blank(): Circle { return new Circle(this.id); }
}
