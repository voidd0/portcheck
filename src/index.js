// portcheck — list listening ports + owning processes.
//
// Linux: parse /proc/net/tcp + /proc/net/tcp6 + /proc/net/udp + /proc/net/udp6
//        and walk /proc/<pid>/fd/* sockets to map inode -> pid.
// macOS / BSD / Windows: shell out to `lsof -nP -iTCP -sTCP:LISTEN -iUDP`
//        and parse the columns.

import { readFileSync, readdirSync, readlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { platform } from 'node:os';

function hexAddrToIpPort(hex) {
  // Linux /proc format: AABBCCDD:PORT — AABBCCDD is little-endian.
  const [addrHex, portHex] = hex.split(':');
  const port = parseInt(portHex, 16);
  let ip;
  if (addrHex.length === 8) {
    // IPv4
    const bytes = [];
    for (let i = 6; i >= 0; i -= 2) bytes.push(parseInt(addrHex.slice(i, i + 2), 16));
    ip = bytes.join('.');
  } else {
    // IPv6 — chunks reversed by 32-bit groups, but 32-bit chunk endianness too
    const groups = [];
    for (let i = 0; i < 32; i += 8) {
      const chunk = addrHex.slice(i, i + 8);
      const reversed = chunk.match(/.{2}/g).reverse().join('');
      groups.push(reversed.slice(0, 4) + ':' + reversed.slice(4, 8));
    }
    ip = '[' + groups.join(':') + ']';
  }
  return { ip, port };
}

function parseProcNetLines(lines, kind) {
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].trim().split(/\s+/);
    if (cols.length < 10) continue;
    const local = cols[1];
    const state = cols[3];
    const inode = cols[9];
    // For TCP, state '0A' = LISTEN. UDP doesn't have listen state, treat all as.
    if (kind === 'tcp' && state !== '0A') continue;
    if (!inode || inode === '0') continue;
    const { ip, port } = hexAddrToIpPort(local);
    rows.push({ ip, port, kind, inode });
  }
  return rows;
}

function buildInodeMap() {
  // Map socket inode -> { pid, comm }. Read each /proc/<pid>/fd/* link;
  // links of the form 'socket:[inode]' are sockets owned by that process.
  const map = {};
  let pids;
  try { pids = readdirSync('/proc'); } catch { return map; }
  for (const pid of pids) {
    if (!/^\d+$/.test(pid)) continue;
    let entries;
    try { entries = readdirSync(`/proc/${pid}/fd`); } catch { continue; }
    let comm = '';
    try { comm = readFileSync(`/proc/${pid}/comm`, 'utf8').trim(); } catch {}
    for (const fd of entries) {
      let target;
      try { target = readlinkSync(`/proc/${pid}/fd/${fd}`); } catch { continue; }
      const m = target.match(/^socket:\[(\d+)\]$/);
      if (m) {
        const inode = m[1];
        if (!(inode in map)) map[inode] = { pid: parseInt(pid, 10), comm };
      }
    }
  }
  return map;
}

function readProcSafely(path) {
  try { return readFileSync(path, 'utf8').split('\n').filter(Boolean); }
  catch { return []; }
}

export function listLinux() {
  const tcp4 = parseProcNetLines(readProcSafely('/proc/net/tcp'), 'tcp');
  const tcp6 = parseProcNetLines(readProcSafely('/proc/net/tcp6'), 'tcp');
  const udp4 = parseProcNetLines(readProcSafely('/proc/net/udp'), 'udp');
  const udp6 = parseProcNetLines(readProcSafely('/proc/net/udp6'), 'udp');
  const all = [...tcp4, ...tcp6, ...udp4, ...udp6];
  const inodes = buildInodeMap();
  return all.map(r => ({
    port: r.port,
    proto: r.kind,
    address: r.ip,
    pid: inodes[r.inode]?.pid ?? null,
    command: inodes[r.inode]?.comm ?? '?',
  }));
}

export function listLsof() {
  const res = spawnSync('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], { encoding: 'utf8' });
  if (res.status !== 0) return [];
  const rows = [];
  const lines = res.stdout.split('\n').slice(1);
  for (const ln of lines) {
    if (!ln.trim()) continue;
    const cols = ln.split(/\s+/);
    if (cols.length < 9) continue;
    const command = cols[0];
    const pid = parseInt(cols[1], 10);
    const name = cols.slice(8).join(' ');
    const portMatch = name.match(/:(\d+)\s*\(LISTEN\)/);
    if (!portMatch) continue;
    const port = parseInt(portMatch[1], 10);
    const address = name.replace(/:\d+\s*\(LISTEN\)/, '');
    rows.push({ port, proto: 'tcp', address, pid, command });
  }
  return rows;
}

export function list() {
  return platform() === 'linux' ? listLinux() : listLsof();
}

export function filterRange(rows, range) {
  if (!range) return rows;
  const m = range.match(/^(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`bad range: ${range}`);
  const lo = parseInt(m[1], 10);
  const hi = m[2] ? parseInt(m[2], 10) : lo;
  return rows.filter(r => r.port >= lo && r.port <= hi);
}

export function format(rows) {
  if (rows.length === 0) return 'no listening ports found.';
  const sorted = [...rows].sort((a, b) => a.port - b.port);
  const lines = [];
  lines.push('port   proto  command         pid     address');
  for (const r of sorted) {
    lines.push(
      `${String(r.port).padEnd(6)} ${r.proto.padEnd(6)} ${(r.command || '?').padEnd(15).slice(0, 15)} ${String(r.pid ?? '?').padEnd(7)} ${r.address}`
    );
  }
  return lines.join('\n');
}
