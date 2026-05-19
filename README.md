# portcheck

[![npm version](https://img.shields.io/npm/v/@v0idd0/portcheck.svg?color=A0573A)](https://www.npmjs.com/package/@v0idd0/portcheck)
[![npm downloads](https://img.shields.io/npm/dw/@v0idd0/portcheck.svg?color=1F1A14)](https://www.npmjs.com/package/@v0idd0/portcheck)
[![License: MIT](https://img.shields.io/badge/license-MIT-A0573A.svg)](LICENSE)
[![Node ≥14](https://img.shields.io/badge/node-%E2%89%A514-1F1A14)](package.json)

**[Homepage](https://tools.voiddo.com/portcheck/?ref=portcheck-readme)** · **[Compare with lsof](https://tools.voiddo.com/portcheck/compare/lsof/?ref=portcheck-readme)** · **[GitHub](https://github.com/voidd0/portcheck)** · **[npm](https://www.npmjs.com/package/@v0idd0/portcheck)** · **[All tools](https://tools.voiddo.com/?ref=portcheck-catalog-readme)** · **[Contact](mailto:support@voiddo.com)**

---

See what's listening on your local ports. Fast. Zero deps. Reads `/proc` directly on Linux, falls back to `lsof` on macOS/BSD.

If you are typing `lsof -i :3000` out of habit, start with the compare page: [portcheck vs lsof](https://tools.voiddo.com/portcheck/compare/lsof/?ref=portcheck-readme).

```
$ portcheck
port   proto  command         pid     address
80     tcp    nginx           1923    0.0.0.0
443    tcp    nginx           1923    0.0.0.0
3000   tcp    node            28471   127.0.0.1
5432   tcp    postgres        1923    127.0.0.1
8000   tcp    uvicorn         2728014 127.0.0.1
```

## Why portcheck

You started a dev server two windows ago. You started another one in this window. They both bound to `:3000`. You don't remember which is which. The fix is `lsof -i :3000`, but `lsof` is slow on machines with many file descriptors and the output is full of fields you don't need. `netstat -tlnp` was deprecated five distros ago. `ss -ltnp` is fast but its column alignment was last touched in the kernel 3.x era.

`portcheck` is what those commands would look like if you wrote them today: column-aligned, sorted by port, no sudo for your own processes, instant on a laptop with 50K open fds.

## Install

```bash
npm install -g @v0idd0/portcheck
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

## Compared to alternatives

| tool | speed on 50K fds | sudo for self | output legibility | macOS support |
|---|---|---|---|---|
| portcheck | <50ms | no | aligned, sorted by port | via `lsof` fallback |
| `lsof -i -P -n` | 2-3s | yes (for others) | dense, hard to scan | yes |
| `ss -ltnp` | <100ms | yes (for cmd) | terse columns | no |
| `netstat -tlnp` | varies | sometimes | 1990s formatting | deprecated |

If you regularly investigate ports across machines you don't own (oncall, debugging others' processes), `lsof -i` is still the canonical answer. For your own laptop and your own processes, portcheck is faster typing and faster reading.

## FAQ

**Why doesn't it need sudo?** On Linux it parses `/proc/<pid>/net/tcp` and `/proc/<pid>/cmdline` for processes you own, which doesn't require elevation. To see ports owned by *other* users, run with sudo — same rule as `lsof`.

**Does it show UDP?** Yes when you ask: `portcheck --proto udp` or `--proto all`. Default is TCP because that's what people actually search for.

**What about systemd-managed sockets that no process holds open yet?** Not visible until the activated process binds. That's a kernel-level signal portcheck deliberately doesn't try to surface — `systemctl list-sockets` is the right tool there.

**Why no docker integration?** Containers running on your host do appear under their PID. If you want container-aware port mapping, `docker ps` shows the published-port column already.

## Programmatic API

```javascript
import { list, filterRange, format } from '@v0idd0/portcheck';

const all = list();
const webPorts = filterRange(all, '80-443');
console.log(format(webPorts));
```

## Tips

- **Pipe to `awk` for ad-hoc filters** — `portcheck --json | jq '.[] | select(.address == "0.0.0.0")'` finds anything bound to a public interface, useful when you wonder why your firewall rule isn't doing what you thought.
- **In docker-compose dev workflows** — run `portcheck` on the host to confirm published ports actually landed; container-internal ports won't appear (they live in the container's net namespace), which is itself a useful signal.
- **As a teardown helper** — `portcheck --json | jq '.[] | select(.command == "node") | .pid' | xargs kill` is the no-ceremony version of "kill all my orphaned dev servers". Use with care.

## Compare with lsof

`lsof` is the classic Swiss-army answer when you want file-descriptor depth. `portcheck` is the quicker answer when the only question is "what is listening on this port?" The compare page spells out the difference in plain language: [portcheck vs lsof](https://tools.voiddo.com/portcheck/compare/lsof/?ref=portcheck-readme).

## From the same studio

vøiddo builds sharp, free-forever CLIs for debugging production-ish messes without opening a GUI:

- [`@v0idd0/dotdig`](https://tools.voiddo.com/dotdig/?ref=portcheck-related-dotdig-readme) — DNS lookup formatted for humans, not RFC archaeology
- [`@v0idd0/sslcheck`](https://tools.voiddo.com/sslcheck/?ref=portcheck-related-sslcheck-readme) — inspect TLS cert expiry, SANs, chain depth, and key strength
- [`@v0idd0/httpwut`](https://tools.voiddo.com/httpwut/?ref=portcheck-related-httpwut-readme) — trace what an HTTP request actually did on the wire
- [`@v0idd0/timecheck`](https://tools.voiddo.com/timecheck/?ref=portcheck-related-timecheck-readme) — convert and rewrite timestamps without leaving the terminal

Full catalog: [tools.voiddo.com](https://tools.voiddo.com/?ref=portcheck-catalog-readme). Full lineup doc: [`from-the-studio.md`](from-the-studio.md).

## From the same studio

- **[@v0idd0/jsonyo](https://www.npmjs.com/package/@v0idd0/jsonyo)** — JSON swiss army knife, 18 commands, zero limits
- **[@v0idd0/envguard](https://www.npmjs.com/package/@v0idd0/envguard)** — stop shipping `.env` drift to staging
- **[@v0idd0/depcheck](https://www.npmjs.com/package/@v0idd0/depcheck)** — find unused dependencies in one command
- **[@v0idd0/gitstats](https://www.npmjs.com/package/@v0idd0/gitstats)** — git repo analytics, one command
- **[View all tools →](https://voiddo.com/tools/)**

## License

MIT.

---

Built by [vøiddo](https://voiddo.com/) — a small studio shipping AI-flavoured products, free dev tools, Chrome extensions and weird browser games.
