export abstract class Shape {
  private readonly attributes = new Map<string, string>();

  protected constructor(private readonly identifier: string, internal = false) {
    if (!internal && (!identifier || /[\s#<>"'&=\x00-\x1f]/u.test(identifier))) {
      throw new Error(`invalid id: ${identifier}`);
    }
  }

  get id(): string { return this.identifier; }
  abstract get tag(): string;
  protected abstract get geometry(): readonly string[];
  protected abstract get horizontal(): readonly string[];
  protected abstract get vertical(): readonly string[];
  protected abstract blank(): Shape;
  get children(): readonly Shape[] { return []; }
  get isContainer(): boolean { return false; }

  protected initializeGeometry(): void {
    for (const key of this.geometry) this.attributes.set(key, '0');
  }

  getAttribute(key: string): string | undefined { return this.attributes.get(key); }
  getAttributes(): ReadonlyMap<string, string> { return new Map(this.attributes); }

  set(key: string, value: string): void {
    if (this.geometry.includes(key) || key === 'stroke-width') {
      const number = Shape.number(value);
      if (['width', 'height', 'r', 'rx', 'ry', 'stroke-width'].includes(key) && number < 0) {
        throw new Error(`${key} must be non-negative`);
      }
      this.attributes.set(key, String(number));
    } else if (['fill', 'stroke'].includes(key)) {
      this.validateText(value);
      this.attributes.set(key, value);
    } else {
      throw new Error(`unknown attribute: ${key}`);
    }
  }

  /** Imported presentation attributes are retained without widening the CLI set whitelist. */
  importAttribute(key: string, value: string): void {
    if (['font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline',
      'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin',
      'stroke-dasharray', 'visibility', 'display', 'data-kind'].includes(key)) {
      this.validateText(value);
      this.attributes.set(key, value);
    } else this.set(key, value);
  }

  move(dx: number, dy: number): void {
    if (![dx, dy].every(Number.isFinite)) throw new Error('move offsets must be finite');
    for (const key of this.horizontal) this.set(key, String(Number(this.attributes.get(key)) + dx));
    for (const key of this.vertical) this.set(key, String(Number(this.attributes.get(key)) + dy));
  }

  scale(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) throw new Error('scale factor must be positive');
    for (const key of this.geometry) this.set(key, String(Number(this.attributes.get(key)) * factor));
  }

  clone(): Shape {
    const copy = this.blank();
    for (const [key, value] of this.attributes) copy.attributes.set(key, value);
    return copy;
  }

  get textContent(): string | undefined { return undefined; }
  protected validateText(value: string): void {
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]/u.test(value)) {
      throw new Error('invalid XML character');
    }
  }

  static number(value: string): number {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) || !Number.isFinite(Number(value))) {
      throw new Error(`invalid number: ${value}`);
    }
    return Number(value);
  }
}
