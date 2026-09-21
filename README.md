# Shikitari

Shikitari is a TypeScript CLI package. The repository currently provides the
project baseline and a minimal executable entry point; product behavior will be
introduced by later Issues.

## Semantic policy

Shikitari defines a tool-independent, LLM-first semantic coding policy. The
policy is the canonical authority for what the codebase requires; formatters,
linters, agent instructions, and future adapters are projections or enforcement
mechanisms derived from it. Shikitari does not redefine architecture authority;
Wabachi remains responsible for architecture semantics.

The initial model and its formatting and naming domains are documented in
[the canonical semantic-policy model](docs/semantic-policy.md). The document
also links to a complete machine-readable example.

## Requirements

- Node.js 24 or newer
- pnpm 11.18.0

## Usage

```bash
pnpm install
pnpm run verify
pnpm exec shikitari --help
```

## Development

```bash
pnpm run build
pnpm test
pnpm run typecheck
pnpm run lint
pnpm run format:check
```

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).
