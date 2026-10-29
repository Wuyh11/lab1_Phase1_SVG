import { DOMParser } from '@xmldom/xmldom';
import { SvgDocument } from '../domain/SvgDocument.js';
import { Shape } from '../domain/Shape.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { Group } from '../domain/Group.js';
import { SvgTransform } from './SvgTransform.js';

type XmlElement = ReturnType<DOMParser['parseFromString']>['documentElement'];

export class SvgCodec {
  private readonly factory = new ShapeFactory();
  encode(document: SvgDocument): string {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${document.width}" height="${document.height}" viewBox="0 0 ${document.width} ${document.height}">\n` +
      document.children.map(shape => this.encodeShape(shape, '  ')).join('') + '</svg>\n';
  }
  decode(source: string): { document: SvgDocument; warnings: readonly string[] } {
    if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(source)) throw new Error('SVG document types and entities are not supported');
    const errors: string[] = [];
    const xml = new DOMParser({ errorHandler: {
      warning: message => errors.push(message), error: message => errors.push(message), fatalError: message => errors.push(message),
    } }).parseFromString(source, 'image/svg+xml');
    if (errors.length || !xml.documentElement) throw new Error('invalid SVG XML');
    const root = xml.documentElement;
    if (root.localName !== 'svg' || (root.namespaceURI && root.namespaceURI !== 'http://www.w3.org/2000/svg')) {
      throw new Error('expected <svg> root');
    }
    const viewBox = root.getAttribute('viewBox').trim();
    const view = viewBox ? viewBox.split(/[\s,]+/).map(value => Shape.number(value)) : [];
    if (view.length && (view.length !== 4 || view[0] !== 0 || view[1] !== 0)) throw new Error('unsupported SVG viewBox: expected 0 0 width height');
    const width = this.dimension(root.getAttribute('width'), view[2] ?? 800);
    const height = this.dimension(root.getAttribute('height'), view[3] ?? 600);
    if (view.length && (view[2] !== width || view[3] !== height)) throw new Error('SVG viewBox must match canvas dimensions');
    const document = new SvgDocument(width, height);
    const elements = this.elements(root);
    const ids = new Set<string>();
    // Reserve all explicit ids before generating any ids, including ids later in the file.
    for (const element of [root, ...this.descendants(root)]) {
      const id = element.getAttribute('id');
      if (!id) continue;
      if (ids.has(id)) throw new Error(`id already exists: ${id}`);
      ids.add(id);
    }
    const warnings: string[] = [];
    for (const element of elements) document.add(this.decodeShape(element, ids, warnings));
    // Preserve root presentation/inheritance by applying it to a synthetic group would
    // introduce an unwanted addressable element. Reject explicit root presentation.
    for (let index = 0; index < root.attributes.length; index++) {
      const attr = root.attributes.item(index)!;
      if (!['xmlns', 'width', 'height', 'viewBox', 'id', 'version'].includes(attr.name)) {
        throw new Error(`unsupported SVG root attribute: ${attr.name}`);
      }
    }
    return { document, warnings };
  }
  private decodeShape(element: XmlElement, ids: Set<string>, warnings: string[]): Shape {
    const tag = element.localName;
    if (element.namespaceURI && element.namespaceURI !== 'http://www.w3.org/2000/svg') throw new Error('unsupported XML namespace');
    let id = element.getAttribute('id');
    if (!id) {
      let index = 1;
      while (ids.has(`${tag}${index}`)) index++;
      id = `${tag}${index}`; ids.add(id);
      warnings.push(`warning: assigned id ${id} to unnamed <${tag}>`);
    }
    const shape = this.factory.empty(tag, id);
    for (let index = 0; index < element.attributes.length; index++) {
      const attribute = element.attributes.item(index)!;
      if (!['id', 'transform', 'xmlns'].includes(attribute.name)) shape.importAttribute(attribute.name, attribute.value);
    }
    if (shape instanceof Group) {
      for (const child of this.elements(element)) shape.insert(this.decodeShape(child, ids, warnings));
      if (this.nonWhitespaceText(element)) throw new Error('unexpected text inside <g>');
    } else {
      if (this.elements(element).length) throw new Error(`unsupported nested content in <${tag}>`);
      if (shape.textContent !== undefined) shape.set('text', element.textContent ?? '');
      else if (this.nonWhitespaceText(element)) throw new Error(`unexpected text inside <${tag}>`);
    }
    if (element.hasAttribute('transform')) new SvgTransform(element.getAttribute('transform')).apply(shape);
    return shape;
  }
  private elements(parent: XmlElement): XmlElement[] {
    const result: XmlElement[] = [];
    for (let index = 0; index < parent.childNodes.length; index++) {
      const child = parent.childNodes.item(index)!;
      if (child.nodeType === 1) result.push(child as XmlElement);
    }
    return result;
  }
  private descendants(parent: XmlElement): XmlElement[] {
    return this.elements(parent).flatMap(child => [child, ...this.descendants(child)]);
  }
  private nonWhitespaceText(parent: XmlElement): boolean {
    for (let index = 0; index < parent.childNodes.length; index++) {
      const child = parent.childNodes.item(index)!;
      if ((child.nodeType === 3 || child.nodeType === 4) && child.nodeValue?.trim()) return true;
    }
    return false;
  }
  private dimension(value: string, fallback: number): number { return value ? Shape.number(value.replace(/px$/, '')) : fallback; }
  private encodeShape(shape: Shape, indent: string): string {
    const attrs = [['id', shape.id], ...shape.getAttributes()].map(([key, value]) => ` ${key}="${this.escape(value!)}"`).join('');
    if (shape.isContainer) {
      return `${indent}<${shape.tag}${attrs}>\n${shape.children.map(child => this.encodeShape(child, indent + '  ')).join('')}${indent}</${shape.tag}>\n`;
    }
    if (shape.textContent !== undefined) return `${indent}<${shape.tag}${attrs}>${this.escape(shape.textContent)}</${shape.tag}>\n`;
    return `${indent}<${shape.tag}${attrs}/>\n`;
  }
  private escape(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/\r/g, '&#13;').replace(/\n/g, '&#10;').replace(/\t/g, '&#9;');
  }
}
