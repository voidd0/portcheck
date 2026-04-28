# portcheck

See what's listening on your local ports. Fast. Zero deps.

```
$ portcheck
port   proto  command         pid     address
80     tcp    nginx           1923    0.0.0.0
443    tcp    nginx           1923    0.0.0.0
3000   tcp    node            28471   127.0.0.1
5432   tcp    postgres        1923    127.0.0.1
8000   tcp    uvicorn         2728014 127.0.0.1
```

## Install

```bash
npm install -g bruh-portcheck
```

## Usage

```bash
# All listening ports
portcheck

# Filter to a single port
portcheck 443

# Filter to a range
portcheck 8000-9000

# JSON for piping
portcheck --json | jq '.[] | select(.command == "node")'
```

## Why not `netstat`/`ss`/`lsof`?

- `netstat -tlnp` — deprecated on most distros, output formatting is from 1990
- `ss -ltnp` — fast but column alignment requires squinting
- `lsof -i -P -n` — slow on machines with many fds, requires sudo for other users

`portcheck` reads `/proc` directly on Linux (no privilege needed for your own processes), falls back to `lsof` on macOS/BSD where `/proc` doesn't exist. Output is dev-friendly: pid, command, address, sorted by port.

## Programmatic API

```javascript
import { list, filterRange, format } from 'bruh-portcheck';

const all = list();
const webPorts = filterRange(all, '80-443');
console.log(format(webPorts));
```

## License

MIT — part of the [vøiddo](https://voiddo.com) tools collection.
