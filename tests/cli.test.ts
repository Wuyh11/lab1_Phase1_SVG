import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';

test('real CLI awaits piped IO, reads generated SVG, recovers from errors and ends on EOF', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-cli-'));
  const path = join(directory, 'with spaces.svg');
  const lines = ['# batch script', 'init 400 200', 'create g flow', 'create rect r 30 70 120 60 #4a90d9 in flow',
    'create text t 40 100 "开始 <&>" in flow', `save "${path}"`, 'init 1 1', `read "${path}"`,
    'move flow 10 20', 'undo', 'redo', `save "${path}"`, 'undo', 'tree', 'bogus', 'show t', ''];
  try {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], { cwd: process.cwd(), stdio: 'pipe' });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const done = new Promise<number | null>((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
    child.stdin.end(lines.join('\n'));
    assert.equal(await done, 0);
    assert.equal(stderr, '');
    assert.match(stdout, /error: undo not allowed after io command/);
    assert.match(stdout, /error: unknown command: bogus/);
    assert.match(stdout, /text#t  parent=g#flow/);
    assert.match(stdout, /svg \(400x200\)/);
    const doc = new SvgCodec().decode(await readFile(path, 'utf8')).document;
    assert.equal(doc.find('r').getAttribute('x'), '40');
    assert.equal(doc.find('t').textContent, '开始 <&>');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
