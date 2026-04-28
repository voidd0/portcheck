import { filterRange, format } from './src/index.js';
import assert from 'node:assert';

function it(name, fn) {
  try { fn(); console.log(`  ok ${name}`); }
  catch (e) { console.error(`  FAIL ${name}: ${e.message}`); process.exitCode = 1; }
}

console.log('portcheck smoke tests');

const sample = [
  { port: 80,   proto: 'tcp', address: '0.0.0.0', pid: 1, command: 'nginx' },
  { port: 443,  proto: 'tcp', address: '0.0.0.0', pid: 1, command: 'nginx' },
  { port: 3000, proto: 'tcp', address: '127.0.0.1', pid: 99, command: 'node' },
  { port: 5432, proto: 'tcp', address: '127.0.0.1', pid: 50, command: 'postgres' },
];

it('filterRange single port', () => {
  const r = filterRange(sample, '443');
  assert.equal(r.length, 1);
  assert.equal(r[0].port, 443);
});

it('filterRange range', () => {
  const r = filterRange(sample, '80-3000');
  assert.equal(r.length, 3);
});

it('filterRange no match', () => {
  const r = filterRange(sample, '9000-9999');
  assert.equal(r.length, 0);
});

it('filterRange bad range throws', () => {
  assert.throws(() => filterRange(sample, 'abc'), /bad range/);
});

it('filterRange undefined returns all', () => {
  assert.equal(filterRange(sample).length, sample.length);
});

it('format produces header', () => {
  const out = format(sample);
  assert.match(out, /port\s+proto\s+command/);
});

it('format empty', () => {
  assert.equal(format([]), 'no listening ports found.');
});

console.log('done');
