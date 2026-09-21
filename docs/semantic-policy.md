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

Naming rules keep four concerns distinct so that a casing preference is not
mistaken for a vocabulary or domain-language rule.

### Form and casing

Form rules describe how a name is written. Scope selects symbol kinds, and the
value can assign forms independently to variables, functions, methods, types,
classes, constants, enum members, and other kinds. Acronym handling is part of
the form rule, for example treating an acronym as a word when converting a
name, rather than being an accidental side effect of a casing algorithm.

Prefixes and suffixes are also form rules. They state the semantic reason and
scope for a prefix or suffix, such as a private-member marker or a type marker;
they are not inferred from casing.

### Vocabulary

Vocabulary rules govern words that are generally preferred or forbidden in
identifiers. A vocabulary entry can map a preferred term to forbidden
abbreviations or vague alternatives. This answers “which word should be used?”
without asserting what a domain concept means.

### Semantics

Semantic naming rules govern the meaning signaled by a name. They can
distinguish verbs such as `get` for retrieving a known existing value from
`find` for searching for a matching value. They can also define pluralization
for collections and boolean naming conventions, such as prefixes that signal
state, capability, or permission. These rules are scoped by the behavior or
kind they describe, not by casing alone.

### Domain terminology and ontology

Terminology rules define the repository's domain concepts and their canonical
names. A concept may declare a canonical term, forbidden synonyms, and
relationships to other concepts. This is different from general vocabulary:
terminology says what the domain means, while vocabulary says which words are
preferred in ordinary identifiers.

## Example

[`examples/semantic-policy.yaml`](../examples/semantic-policy.yaml) is a
complete policy covering the initial formatting and naming vocabulary. It is
intentionally readable as a set of requirements by an LLM without knowledge
of Shikitari internals or any particular enforcement tool.
