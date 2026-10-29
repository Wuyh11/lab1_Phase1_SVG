import { Shape } from './Shape.js';
export class Group extends Shape {
  private readonly items: Shape[] = [];
  constructor(id: string, internal = false) { super(id, internal); }
  get tag(): string { return 'g'; }
  protected get geometry(): readonly string[] { return []; }
  protected get horizontal(): readonly string[] { return []; }
  protected get vertical(): readonly string[] { return []; }
  protected blank(): Group { return new Group(this.id, this.id === ''); }
  override get children(): readonly Shape[] { return [...this.items]; }
  override get isContainer(): boolean { return true; }

  contains(shape: Shape): boolean {
    return this === shape || this.items.some(child => child === shape || (child instanceof Group && child.contains(shape)));
  }
  insert(shape: Shape, index = this.items.length): void {
    if (shape === this || (shape instanceof Group && shape.contains(this))) throw new Error('cannot create container cycle');
    if (this.items.includes(shape)) throw new Error(`shape already in container: ${shape.id}`);
    this.items.splice(index, 0, shape);
  }
  remove(shape: Shape): number {
    const index = this.items.indexOf(shape);
    if (index < 0) throw new Error(`shape is not in container: ${shape.id}`);
    this.items.splice(index, 1);
    return index;
  }
  override move(dx: number, dy: number): void { super.move(dx, dy); for (const child of this.items) child.move(dx, dy); }
  override scale(factor: number): void {
    super.scale(factor);
    for (const child of this.items) child.scale(factor);
  }
  override clone(): Group {
    const copy = super.clone() as Group;
    for (const child of this.items) copy.insert(child.clone());
    return copy;
  }
}
