# Security policy

## Reporting a vulnerability

Please report security issues privately, not in a public issue:

1. Go to the [Security tab](https://github.com/akaaff/burnbar/security) of this repository.
2. Select **Report a vulnerability** and describe the problem, how to reproduce it, and which version you used.

Only the maintainer can see the report. I aim to acknowledge it within 7 days, investigate, and publish a fix as a new version, crediting you if you'd like.

## Supported versions

Only the latest release, the newest version on `main`, receives fixes. Update with:

```bash
claude plugin update burnbar@burnbar
```

## Scope

burnbar reads the usage-limit figures and the `theme` setting that Claude Code provides, and draws them on screen. It makes no network requests, runs no processes, and reads or writes no files. Anything that would let it do more than that, or let another plugin or input abuse it, is in scope.
