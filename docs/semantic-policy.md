# Canonical semantic-policy model

This document defines Shikitari's initial semantic-policy model. It is written
for people and coding agents first; an enforcement tool may consume the model,
but the model does not depend on a particular tool.

## Responsibility and authority

Shikitari owns the semantic policy: the stable vocabulary for stating what a
repository requires and the meaning of each requirement. A formatter, linter,
agent configuration, review system, or other adapter may project or enforce
that policy, but its configuration is not an alternative source of truth.

The policy describes coding semantics, not the implementation of Shikitari. It
does not execute checks, generate tool configuration, or review code. Wabachi
remains the authority for architecture semantics; Shikitari may consume
architecture information in a later domain without redefining it here.

Formatting and naming are the first domains. `implementation`, `testing`,
`security`, and `architecture` are reserved future domains only: reserving a
domain does not define its rules in this model.

## Core concepts

| Concept     | Meaning                                                                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Policy      | A named, versioned collection of semantic rules and their domain vocabulary.                                                                         |
| Domain      | A category of rules, such as `formatting` or `naming`. Adding a domain does not change the meaning of existing rules.                                |
| Rule        | The smallest independently referencable normative statement. A rule has a stable `id` and exactly one `domain`.                                      |
| Scope       | The semantic set to which a rule can apply, such as a language, file kind, construct, or symbol kind.                                                |
| Requirement | The normative action or state, such as `require`, `prefer`, or `forbid`, and the semantic subject to which it applies.                               |
| Value       | The target form, value, or vocabulary associated with a requirement. It is optional only when the requirement is complete without one.               |
| Condition   | A machine-readable predicate that narrows when a rule applies. Conditions do not replace scope.                                                      |
| Constraint  | A machine-readable bound or relationship on a value, such as a maximum or an allowed set.                                                            |
| Intent      | Human-readable rationale that explains why the rule exists; it does not change the requirement.                                                      |
| Projection  | A derived representation of one or more canonical rules for a target audience or tool category. A projection preserves meaning but may change shape. |
| Enforcement | A process that checks or applies a projection. Enforcement reports an outcome; it cannot silently redefine the source rule.                          |

The relationship is therefore:

`policy → domain → rule → scope / requirement / value / conditions / constraints`

`rule → projection → enforcement`

The second path is optional and downstream. A policy remains meaningful when no
projection or enforcement exists.

## Canonical rule shape

The following is the semantic shape, not a final schema. Implementations may
serialize it as YAML, JSON, or another machine-readable format while retaining
these meanings.

```yaml
policy:
  id: stable-policy-identifier
  version: 1
  title: Human-readable policy name
  domains:
    - formatting
  rules:
    - id: formatting.example-rule
      domain: formatting
      scope:
        languages: [typescript]
        file-kinds: [source]
      requirement:
        action: require
        subject: example-semantic-subject
      value:
        form: example-target-value
      conditions:
        all:
          - field: syntax.example-property
            operator: equals
            value: example-condition
      constraints:
        - field: value.example-property
          operator: less-than-or-equal
          value: 100
      intent: Explain the human reason for this rule.
```

### Identity and applicability

- `policy.id` identifies the policy, and `policy.version` identifies a revision
  of its meaning. A serialized filename is not an identity.
- `rule.id` is stable and semantic, for example
  `formatting.line-width`. It must not be the name of an option in a specific
  tool.
- `domain` is the rule's semantic category. A rule belongs to one domain.
- `scope` describes the broad applicability set. Its fields are semantic
  selectors such as `languages`, `file-kinds`, `constructs`, `symbol-kinds`,
  and `paths`; an adapter may translate them to its own selector language.
- `conditions.all` and `conditions.any` contain predicates with a `field`, an
  `operator`, and a comparison `value`. A condition can narrow a scoped rule,
  such as applying a trailing-comma requirement only to a multiline construct.

An absent scope means the rule has no additional scope beyond its domain. An
absent condition means the rule applies throughout its scope.

### Meaning and rationale

- `requirement.action` states the norm. Use `require` for a mandatory form,
  `prefer` for a chosen form with an allowed exception, and `forbid` for a
  form that must not be used. The subject names the semantic thing being
  governed.
- `value` states the target independently from the action. For example,
  `action: require` and `value: {unit: spaces, width: 2}` means that the
  required indentation uses two spaces; it does not name an adapter setting.
- `constraints` use the same predicate shape as conditions to express bounds,
  allowed values, or relationships that the value must satisfy.
- `intent` explains the reason in terms useful to a person or coding agent.
  It is context, not an additional rule.

### Projection and enforcement

A projection names its canonical inputs and its target representation. An
enforcement entry names the projection it consumes and whether it checks,
reports, or applies that representation. For example:

```yaml
projections:
  - id: formatting-adapter-input
    source-rules:
      - formatting.example-rule
    target:
      kind: formatter
    status: planned

enforcement:
  - id: formatting-check
    projection: formatting-adapter-input
    mode: check
    status: planned
```

These entries are downstream metadata. The canonical rule remains the
authority, and adding an adapter later must not require changing what the rule
means.

## Formatting domain

Formatting rules describe the desired representation of source text. They use
the following semantic vocabulary:

| Concept                           | Canonical meaning                                                                                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Indentation                       | The unit and width used to increase nesting depth. The value identifies a unit such as `spaces` or `tabs` and, where relevant, its width.                         |
| Quote delimiter                   | The delimiter used for a string-like construct, such as `single` or `double`. Scope identifies which constructs are covered.                                      |
| Semicolon / statement termination | Whether a statement ends with an explicit semicolon: `present`, `absent`, or another domain-defined semantic form.                                                |
| Trailing comma                    | Whether a delimited, multiline construct ends with a comma: `present`, `absent`, or `allowed`. The condition identifies the construct and whether it spans lines. |
| Line width                        | The maximum rendered line length and the measurement unit, normally source columns. The value is a constraint, not a formatter setting.                           |
| Line ending                       | The newline sequence used by text files, such as `lf` or `crlf`.                                                                                                  |

Each concept is scoped to the constructs it governs. A policy can therefore
require double quote delimiters for string literals without making a claim
about unrelated text, or require a trailing comma only for multiline argument
lists. Formatting rules state representation; they do not name a formatter's
configuration keys.

## Naming domain

The Naming Canon is the semantic authority for names. Its five semantic rules
are `form`, `lexicon`, `semantics`, `concepts`, and `constraints`; the
validation outcome vocabulary below is shared by those rules. They deliberately
remain separate. A casing observation is not a vocabulary decision, a preferred
word is not a domain concept, and a language restriction is not repository
terminology.

The checked-in discovery report is evidence for these decisions:
[`docs/research/naming-discovery.md`](research/naming-discovery.md). It records
what the declaration-based discoverer observed in five repositories. It does
not supply authority. In particular:

`observed != canonical`

Frequency, prevalence, co-occurrence, casing, and the names of tool options
can identify a question for a maintainer; they cannot answer it or generate a
Canon entry. The entries in the example are explicit policy decisions, not
automatic promotions from the report.

### Naming Canon representation

Each Naming Canon rule has a semantic `value` with the corresponding shape.
The fields are intentionally domain terms rather than ESLint, Prettier,
Biome, or other adapter option names.

#### Form

`form` describes how an identifier is written. It may contain:

- `casing-by-symbol-kind`, with independent forms for variables, parameters,
  properties, functions, methods, classes, interfaces, types, enums, and enum
  members;
- `acronym-handling`, which records whether an acronym is treated as a word or
  preserved as an acronym; and
- `prefixes` and `suffixes`, each scoped to a symbol kind and justified by a
  semantic role.

Pluralization is also form information when it describes the written shape of
collection names. It must not be inferred from a frequently observed suffix.
An unknown or ambiguous form remains unknown; the discoverer's `unknown`
category is not a recommendation.

#### Lexicon

`lexicon` governs ordinary identifier words without claiming that they name a
domain concept. Every entry has a `term` and a `strength`:

| Strength      | Meaning                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------- |
| `canonical`   | The selected spelling for this vocabulary item.                                               |
| `preferred`   | The normal choice; an exception can be allowed by the surrounding rule.                       |
| `discouraged` | Understandable and not automatically a violation, but use the selected alternative when able. |
| `forbidden`   | A violation in the applicable scope.                                                          |

These strengths must not be collapsed. `replacement`, `scope`, and `reason`
can explain an entry without changing its strength. A lexicon entry is not a
concept alias: concept aliases belong under `concepts`.

#### Semantics

`semantics` assigns meaning to names when the implementation behavior is
known. It is configurable by behavior and scope, not by prevalence. For
example, the example policy uses `get` for retrieving a known existing value
and `find` for searching for a match. It distinguishes `remove` (detach while
retaining the underlying thing) from `delete` (erase it), and gives `create`
the meaning of introducing a new value. Boolean prefixes communicate the
meaning of the result: `is` for state, `has` for possession or containment,
and `can` for capability.

The same spelling may have different guidance in different semantic contexts;
that is why these decisions do not belong in casing or a flat word list. A
semantic entry must not assert behavior that discovery did not observe or a
maintainer did not decide.

#### Concepts

`concepts` contains terminology with a canonical term and explicit
`allowed-aliases` and `forbidden-aliases`. Organization/shared concepts and
repository-specific concepts are separate collections. A repository-specific
concept may use the same word as a shared concept only when its definition and
scope are still explicit; it is not silently merged with the shared concept.

The report's shared vocabulary is an observation, not a shared concept. A
maintainer must make the concept decision before adding it here. Product names,
implementation nouns, and low-frequency terms require the same decision.

#### Constraints

`constraints` contains language and platform knowledge that applies before
repository vocabulary. Builtin TypeScript knowledge is represented under
`builtin-language-knowledge`, with its source language and constraint kind;
reserved or contextual identifiers do not appear as duplicated lexicon
entries. Repository constraints are separate and may add local restrictions.

Tool configuration keys are not constraints or concepts. For example,
`printWidth`, `semi`, and `camelcase` may be adapter vocabulary, but they do
not belong in this Canon. A projection may translate a semantic rule to such a
key later without making that key authoritative.

### Validation outcomes and unknowns

Conceptual validation has three outcomes:

1. `canonical-or-allowed`: the name matches a canonical, preferred, or
   discouraged (allowed with guidance) decision, or an explicitly allowed alias
   in scope; retain the lexicon strength in the report;
2. `violation`: the name matches a forbidden decision or a builtin language
   constraint; and
3. `unknown-requires-decision`: the available Canon and builtin knowledge do
   not decide the name.

`unknown-requires-decision` is an explicit state. It is neither acceptance nor
violation: record the unresolved spelling or meaning, ask for a maintainer
decision, and only then update the Canon. Discovery cannot resolve an unknown
by selecting the most common spelling, a synonym, or a tool option.

For an LLM applying this policy, first check builtin constraints, then identify
the symbol's form and behavior, then consult the scoped lexicon and concept
collections. Report the matching outcome and the reason. If the behavior,
concept, alias, or form is not covered, report
`unknown-requires-decision`; do not invent a synonym, infer correctness, or
promote an observation.

## Example

[`examples/semantic-policy.yaml`](../examples/semantic-policy.yaml) is a
complete policy covering the initial formatting and naming vocabulary. It is
intentionally readable as a set of requirements by an LLM without knowledge
of Shikitari internals or any particular enforcement tool.
