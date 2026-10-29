import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, chmod, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { LocalDocumentStore } from '../src/infrastructure/LocalDocumentStore.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

const codec = new SvgCodec();

test('external SVG from assignment loads all seven elements with a warning', () => {
  const result = codec.decode(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>
    <text id="t1" x="10" y="290">imported</text><circle id="c1" cx="50" cy="50" r="10"/>
    <g id="g1"><rect id="r2" width="10" height="10"/><circle id="c2" cx="5" cy="5" r="2"/></g>
    <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/></svg>`);
  assert.equal(result.document.size, 7);
  assert.deepEqual(result.warnings, ['warning: assigned id rect1 to unnamed <rect>']);
  assert.equal(result.document.parentOf(result.document.find('r2')).id, 'g1');
});

test('auto ids reserve later explicit ids, work per tag and include unnamed groups', () => {
  const result = codec.decode('<svg><rect/><rect id="rect1"/><g><circle/><circle id="circle1"/></g><rect/></svg>');
  assert.deepEqual(result.document.flatten().map(shape => shape.id), ['rect2', 'rect1', 'g1', 'circle2', 'circle1', 'rect3']);
  assert.equal(result.warnings.length, 4);
});

test('roundtrip preserves order, geometry, all styles, Unicode and XML special characters', () => {
  const doc = new SvgDocument(350.5, 200);
  const factory = new ShapeFactory();
  doc.add(factory.create('g', 'group', []));
  const text = factory.create('text', 'text', ['1', '2', '你好 <&> "quote"\nline\tend\r']);
  text.set('fill', 'url("#a&b")');
  doc.add(text, 'group');
  const first = codec.encode(doc);
  const second = codec.decode(first);
  assert.equal(codec.encode(second.document), first);
  assert.equal(second.document.find('text').textContent, text.textContent);
  assert.deepEqual(second.warnings, []);
});

test('imported text presentation and box marker degrade to ordinary g', () => {
  const doc = codec.decode('<svg><g id="box" data-kind="box" fill="red"><text id="label" font-size="16" text-anchor="middle">开始</text></g></svg>').document;
  assert.equal(doc.find('box').tag, 'g');
  assert.equal(doc.find('label').getAttribute('font-size'), '16');
  assert.match(codec.encode(doc), /data-kind="box"/);
});

test('nested translate and uniform scale flatten into geometry in correct matrix order', () => {
  const doc = codec.decode('<svg width="400" height="200"><g id="outer" transform="translate(60,40)"><g id="inner" transform="translate(200,0) scale(0.8)"><rect id="r" width="120" height="60"/><text id="t" x="60" y="38">End</text></g></g></svg>').document;
  assert.equal(doc.find('r').getAttribute('x'), '260');
  assert.equal(doc.find('r').getAttribute('y'), '40');
  assert.equal(doc.find('r').getAttribute('width'), '96');
  assert.equal(doc.find('t').getAttribute('x'), '308');
  assert.equal(doc.find('t').getAttribute('y'), '70.4');
  assert.equal(doc.find('t').getAttribute('font-size'), '12.8');
  assert.equal(doc.find('r').getAttribute('stroke-width'), '0.8');
  const order = codec.decode('<svg><rect id="r" x="1" y="2" transform="scale(2) translate(3 4)"/></svg>').document;
  assert.equal(order.find('r').getAttribute('x'), '8');
  assert.equal(order.find('r').getAttribute('y'), '12');
});

test('flattened transforms scale inherited text size and stroke width without losing overrides', () => {
  const doc = codec.decode('<svg><g id="p" font-size="20" stroke-width="4" transform="scale(2)"><g id="g" transform="scale(0.5)"><text id="a">A</text><text id="b" font-size="30">B</text></g></g></svg>').document;
  assert.equal(doc.find('a').getAttribute('font-size'), '20');
  assert.equal(doc.find('b').getAttribute('font-size'), '30');
  assert.equal(doc.find('a').getAttribute('stroke-width'), '4');
});

for (const [label, source] of [
  ['duplicate id', '<svg><g id="x"><rect id="x"/></g></svg>'],
  ['malformed xml', '<svg><rect></svg>'],
  ['wrong root', '<html/>'],
  ['DTD', '<!DOCTYPE svg [<!ENTITY x "boom">]><svg/>'],
  ['unsupported element', '<svg><path id="p" d="M0 0"/></svg>'],
  ['nested text markup', '<svg><text id="t"><tspan>bad</tspan></text></svg>'],
  ['negative geometry', '<svg><circle id="c" r="-1"/></svg>'],
  ['wrong namespace', '<svg xmlns="https://invalid.test"><rect id="r"/></svg>'],
  ['rotation', '<svg><g id="g" transform="rotate(10)"/></svg>'],
  ['nonuniform scale', '<svg><g id="g" transform="scale(2 3)"/></svg>'],
  ['viewbox mismatch', '<svg width="20" height="20" viewBox="0 0 10 10"/>'],
  ['unknown attribute', '<svg><rect id="r" onclick="x()"/></svg>'],
] as const) {
  test(`reject ${label} explicitly`, () => assert.throws(() => codec.decode(source)));
}

test('width/height px and missing dimensions with viewBox are supported', () => {
  assert.equal(codec.decode('<svg width="120px" height="40px"/>').document.width, 120);
  assert.equal(codec.decode('<svg viewBox="0 0 100 50"/>').document.height, 50);
});

test('real file roundtrip and failed writes preserve existing contents, clean temp files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lab1-svg-test-'));
  const path = join(directory, 'a b.svg');
  const store = new LocalDocumentStore();
  try {
    const doc = new SvgDocument(400, 300);
    doc.add(new ShapeFactory().create('rect', 'r', ['1', '2', '3', '4', '#abc']));
    await store.write(path, doc);
    assert.equal(codec.encode((await store.read(path)).document), codec.encode(doc));
    await writeFile(path, 'protected'); await chmod(path, 0o444);
    await assert.rejects(store.write(path, doc), /cannot write file:/);
    assert.equal(await readFile(path, 'utf8'), 'protected');
    assert.deepEqual(await readdir(directory), ['a b.svg']);
    await assert.rejects(store.read(join(directory, 'missing.svg')), /cannot read file:/);
    await assert.rejects(store.write(join(directory, 'missing', 'a.svg'), doc), /cannot write file:/);
  } finally { await chmod(path, 0o644).catch(() => undefined); await rm(directory, { recursive: true, force: true }); }
});
