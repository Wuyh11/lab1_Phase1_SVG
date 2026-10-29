import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

test('production dependencies follow the documented layers and each class matches its filename', async () => {
  const source = resolve('src');
  const files: string[] = [];
  const pending = [source];
  while (pending.length) {
    const directory = pending.pop()!;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.name.endsWith('.ts')) files.push(path);
    }
  }
  const allowed: Record<string, readonly string[]> = {
    domain: ['domain'], application: ['application', 'domain'],
    infrastructure: ['infrastructure', 'application', 'domain'], cli: ['cli', 'application'],
  };
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const local = relative(source, file);
    const layer = local.split(sep)[0]!;
    for (const match of content.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const target = match[1]!;
      if (target.startsWith('.')) {
        const targetLayer = relative(source, resolve(dirname(file), target)).split(sep)[0]!;
        if (allowed[layer]) assert.ok(allowed[layer]!.includes(targetLayer), `${local} -> ${target}`);
      } else if (layer === 'domain' || layer === 'application') {
        assert.fail(`inner layer imports external dependency: ${local} -> ${target}`);
      }
    }
    const classes = [...content.matchAll(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g)].map(match => match[1]);
    assert.ok(classes.length <= 1, `multiple classes in ${local}`);
    if (classes.length) assert.equal(file.split(sep).pop(), `${classes[0]}.ts`);
    assert.doesNotMatch(content, /\bswitch\s*\(/, `unexpected switch in ${local}`);
  }
});
