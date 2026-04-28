#!/usr/bin/env node
import { list, filterRange, format } from '../src/index.js';

const args = process.argv.slice(2);

function help() {
  console.log(`
portcheck — list listening tcp/udp ports + owning processes.

  portcheck                    list all listening ports
  portcheck 8080               filter to a single port
  portcheck 8000-9000          filter to a range
  portcheck --json [range]     json output
  portcheck -h, --help         show this

linux: reads /proc directly. macos/bsd: shells out to lsof.

examples:
  portcheck
  portcheck 80-443
  portcheck --json | jq '.[] | select(.command == "node")'
`);
}

if (args.includes('-h') || args.includes('--help')) {
  help();
  process.exit(0);
}

const wantJson = args.includes('--json');
const positional = args.filter(a => !a.startsWith('--'));
const range = positional[0];

try {
  const rows = filterRange(list(), range);
  if (wantJson) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log(format(rows));
  }
} catch (e) {
  console.error(`portcheck: ${e.message}`);
  process.exit(2);
}
