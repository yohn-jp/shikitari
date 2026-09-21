# Naming discovery evidence

This document records the bounded Issue #8 comparison. It is an evidence
report, not a Naming Canon. Repository prevalence is evidence only:
**observed != canonical**.

## Method and scope

Each repository was processed with the same `discoverNamingEvidence` contract
from the Wave 2 TypeScript discoverer. The discoverer uses the TypeScript
Compiler API, walks declaration nodes only, applies the same built-in and
`.gitignore` exclusions, emits deterministic observations, and performs no
semantic synonym inference or correctness judgment. Counts below are
declaration observations, not references or lines of code. The Shikitari path
is the current Issue #10 worktree so that the Wave 2 discoverer is exercised;
its counts therefore include the discoverer implementation itself.

| Repository          | Evidence revision                          | TypeScript files with observations | Observations |
| ------------------- | ------------------------------------------ | ---------------------------------: | -----------: |
| `yohn-jp/shikitari` | `65c75949b24c767688eb76b98e965e73232b4855` |                                  6 |          398 |
| `yohn-jp/gh-inari`  | `ca090bb7f5f2bce3dc0c27e6792189ee6bf980c2` |                                321 |       43,233 |
| `yohn-jp/nawabari`  | `db5a04334591d7284bc79d6d23fa5cbddfe672dd` |                                115 |       15,714 |
| `yohn-jp/wabachi`   | `ce96e2000a736edb359e2c19f3130e3fca726830` |                                 91 |        7,636 |
| `yohn-jp/suzukuri`  | `0f931cf9538b1eb10f83b560e229b6f4742b2124` |                                 47 |        4,649 |

The first four paths were existing local worktrees. The existing Suzukuri
worktree had pre-existing changes, so the same repository was cloned to a
temporary read-only path for discovery. No external repository files, refs,
or worktrees were changed.

## Casing/form distributions

The discoverer classifies mechanical identifier form. `C` = camel, `P` =
pascal, `F` = flat, `S` = snake, `SS` = screaming-snake, `M` = mixed, and
`U` = explicit unknown (the reason is retained in machine-readable evidence).
Only non-zero forms are shown. These are observations by declaration kind,
not recommendations for that kind.

| Repository | Class / interface / type / enum                              | Function / method                         | Variable                       | Parameter              | Property                     |
| ---------- | ------------------------------------------------------------ | ----------------------------------------- | ------------------------------ | ---------------------- | ---------------------------- |
| shikitari  | class P1; interface P19; type P5,M1                          | function C45,F3; method F1                | F95,C32,SS9                    | F102,C13               | F55,C17                      |
| gh-inari   | class P229,M3; interface P1105,M7; type P745,M7              | function C3483,F295; method C413,F211,U13 | F10967,C4411,SS1420,U24,S2,P18 | F11214,C1051,U119,U14  | F5689,C1623,SS31,S27,P4,U108 |
| nawabari   | class P13,M1; interface P142,M4; type P373,M4                | function C1055,F64; method C178,F114      | F4358,C2023,SS393,S6           | F3418,C456,S25,U96,U10 | F1697,S711,C572,U1           |
| wabachi    | class P9; interface P270,M6; type P96                        | function C779,F38,P2; method F27,C25      | F1634,C853,SS88,P1             | F2066,C229,U2,U2       | F1005,C503,U1                |
| suzukuri   | class P22; interface P136,M6; type P52,M1; enum P1/member M2 | function C453,F20; method C22,F19         | F1193,C565,SS67,U1             | F1072,C119,U10,U2      | F723,C163                    |

The two `U` entries in a cell are `unknown:ambiguous` and
`unknown:unsupported-characters`, respectively, where both occur; otherwise
the single `U` count is the only unknown category observed for that cell.
Pascal declarations are common for type-like symbols, while flat/camel forms
dominate value-level symbols in all five repositories. The distribution is
not uniform: Nawabari has substantial snake-case properties and Gh-inari has
more explicit unknown property/parameter forms.

## Leading verbs

Leading verbs are a fixed lexical detector in the evidence model. The most
frequent exact observed spellings are:

| Repository | Leading-verb observations (exact spelling and count)                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shikitari  | `create` 2, `validate` 2, `add` 1, `get` 1, `make` 1, `parse` 1, `serialize` 1                                                                                       |
| gh-inari   | `validate` 272, `create` 159, `parse` 141, `get` 106, `resolve` 81, `render` 50, `serialize` 47, `add` 40; also `deserialize` 26, `handle` 25, `build` 23, `find` 22 |
| nawabari   | `validate` 65, `create` 56, `resolve` 49, `parse` 28, `remove` 21, `add` 14, `make` 12, `get` 7, `update` 7                                                          |
| wabachi    | `create` 68, `render` 30, `validate` 30, `add` 24, `build` 20, `resolve` 12, `get` 7, `serialize` 7                                                                  |
| suzukuri   | `parse` 36, `validate` 25, `create` 15, `resolve` 13, `format` 9, `get` 8, `add` 5, `make` 5, `remove` 5                                                             |

Low-frequency and casing variants are retained as evidence: Gh-inari has
`Create` 5, `Resolve` 3, `Build` 1, `Format` 1, `CREATE` 1, `DELETE` 1,
`UPDATE` 1; Nawabari has `Resolve` 2, `Update` 2, and `Create` 1; Suzukuri
has `Parse` 2 and `Render` 1. These variants are not normalized here.

## Boolean-prefix patterns

The mechanical boolean-prefix detector observed the following exact forms:

| Repository | Prefix observations                                                 |
| ---------- | ------------------------------------------------------------------- |
| shikitari  | `is` 9, `has` 4                                                     |
| gh-inari   | `is` 267, `allowed` 115, `has` 89, `can` 1, `should` 1, `ALLOWED` 1 |
| nawabari   | `is` 103, `allowed` 37, `has` 23, `should` 1                        |
| wabachi    | `is` 39, `has` 6, `allowed` 5, `May` 4                              |
| suzukuri   | `is` 45, `has` 10, `allowed` 7, `should` 1                          |

This is prefix spelling evidence. It does not establish that a declaration
is semantically boolean or that any prefix is preferred.

## Acronym patterns

The acronym field mechanically records all-uppercase or digit-only lexical
tokens; it is not a semantic acronym classifier. Representative high-count
observations are:

| Repository | Representative exact tokens                                                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shikitari  | `DEFAULT` 2, `IGNORED` 2; most other tokens occur once in the discoverer implementation                                                                                                 |
| gh-inari   | `KEYS` 268, `MAX` 217, `CHANGE` 122, `VERSION` 98, `LENGTH` 96, `PATTERN` 89, `REPOSITORY` 82, `IMPLEMENTATION` 80, `ISSUE` 75, `REQUEST` 69, `ID` 69, `PATH` 57, `SHA` 56, `BRANCH` 54 |
| nawabari   | `VERSION` 53, `SCHEMA` 48, `MAX` 42, `RUNTIME` 35, `ID` 33, `SESSION` 33, `SET` 28, `WORKING` 28, `CONTRACT` 24, `DEFAULT` 21, `PNPM` 21, `TGREP` 21                                    |
| wabachi    | `SET` 15, `WORKING` 15, `KINDS` 11, `VERSION` 11, `MAX` 9, `SCHEMA` 7, `CANDIDATE` 6, `CANON` 6, `HTML` 6                                                                               |
| suzukuri   | `VERSION` 23, `ID` 12, `TYPESCRIPT` 12, `ADAPTER` 10, `JSON` 10, `GENERIC` 9, `DEFAULT` 8, `SCHEMA` 8, `TEXT` 8                                                                         |

Repeated lexical concepts have casing variants across the corpus, including
`ID|Id|id`, `JSON|Json|json`, `API|Api|api`, `URL|Url|url`,
`CLI|Cli|cli`, `HTTP|Http`, `MCP|Mcp|mcp`, `PR|Pr|pr`, `SHA|Sha|sha`, and
`CONFIG|Config|config`. These are unresolved spelling observations, not
equivalence or Canon decisions.

## Lexical vocabulary

### Shared across all five repositories

The highest-occurrence case-folded terms present in all five repositories
were: `path` 2,468; `value` 2,117; `result` 1,947; `id` 1,638; `error`
1,637; `input` 1,576; `repository` 1,454; `entry` 1,003; `options` 875;
`diagnostics` 853; `source` 822; `version` 709; `name` 678; `index` 665;
`kind` 660; `context` 659; `root` 597; `diagnostic` 541; `message` 537;
`status` 514; `is` 485; `identity` 483; `command` 465; `right` 451;
`left` 444; `output` 440; `read` 436; `fixture` 414; `validate` 400;
`directory` 381; `line` 375; `run` 343; `create` 331; `file` 297; and
`text` 279.

These counts are pooled token occurrences and are not size-normalized. They
show shared observed vocabulary only; they do not make a term canonical.

### Repository-local representative terms

Terms below occurred in only one repository in this comparison. They are
representative bounded evidence, not a complete vocabulary export.

| Repository | Representative local terms (highest observed counts first)                                                                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shikitari  | `term` 11, `aggregate` 7, `acronym` 4, `analysis` 3, `pluralization` 3, `gitignore` 2, `negated` 2, `hyphen`, `plural`, `underscore`, `unescaped`                                                                                   |
| gh-inari   | `pull` 732, `violations` 456, `template` 312, `violation` 221, `issuance` 200, `hub` 179, `app` 174, `golden` 169, `relay` 162, `certificate` 151, `issuer` 136, `governance` 124, `delegator` 122, `certification` 94, `broker` 86 |
| nawabari   | `backend` 148, `sandbox` 87, `pnpm` 65, `lock` 60, `landlock` 57, `nix` 51, `fhs` 48, `nawabari` 47, `tgrep` 45, `store` 44, `integration` 37, `garbage` 36, `released` 32                                                          |
| wabachi    | `fact` 191, `entity` 93, `flow` 71, `facts` 57, `providers` 42, `quality` 42, `entities` 33, `react` 33, `structurizr` 24, `instance` 23, `responsibility` 21, `losses` 20                                                          |
| suzukuri   | `reductions` 15, `reduced` 14, `builtin` 13, `scripts` 13, `severity` 13, `vitest` 13, `adapters` 11, `preserved` 10, `renderers` 8, `manager` 7, `priorities` 7, `suzukuri` 7                                                      |

### Variants, conflicts, and low-frequency evidence

The following are unresolved comparison categories for Issue #9:

- Singular/plural and related spellings coexist, including
  `result/results`, `request/requests`, `state/states`, `option/options`,
  `diagnostic/diagnostics`, `path/paths`, `source/sources`, `value/values`,
  and `name/names`. The discoverer reports lexical forms; it does not decide
  whether any pair is semantically equivalent.
- Casing conflicts occur for the same case-folded term, as shown in the
  acronym section. Leading-verb variants (`create/Create/CREATE`,
  `parse/Parse`, `render/Render`, and `resolve/Resolve`) and boolean-prefix
  variants (`allowed/Allowed/ALLOWED`, `is/Is`, `has/Has`) remain observed
  variants.
- Low-frequency vocabulary should not be promoted from one or two
  occurrences. Examples include Shikitari's `hyphen` and `underscore`,
  Gh-inari's `JTI`/`GRAPHQL`, Nawabari's `nixos`, Wabachi's `CSS`/`GRAFT`,
  and Suzukuri's `PATHSPEC`/`NPM`. Their presence is evidence that a term
  exists, not evidence that it belongs in the Canon.
- Terms that look product-specific (`relay`, `delegator`, `landlock`,
  `tgrep`, `structurizr`, `suzukuri`, and `nawabari`) require human semantic
  judgment before any Canon treatment. Mechanical frequency, casing, or
  co-occurrence cannot determine whether such a term is portable vocabulary,
  an implementation detail, a proper name, or a domain concept.

The report therefore supplies observations for final Canon work while making
no automatic promotion, synonym merge, casing normalization, or ontology
decision.

## Verification and cleanliness

- Focused checks after the two concrete discoverer boundary fixes:
  `pnpm test -- src/naming/*.test.ts src/cli.test.ts` — 13 passed, 0 failed.
- The initial uniform run exposed two valid-input defects in the discoverer:
  terminal uppercase tokens could dereference an absent next character, and
  valid `.d.mts` declaration files could trigger `transpileModule`'s output
  generation failure. The minimal corrections were made in the shared
  evidence boundary and parser diagnostics path before this report was
  generated.
- All five repositories then completed the same discovery contract with no
  errors.
- `gh-inari`, `nawabari`, and `wabachi` were clean before and after
  discovery. The existing Suzukuri worktree was already dirty before this
  work (`package.json`, `pnpm-lock.yaml`, and `.suzukuri/`); it remained
  unchanged. Discovery used a clean temporary clone at the revision above.
- No source rename, Canon generation, projection, or external repository
  mutation was performed.
