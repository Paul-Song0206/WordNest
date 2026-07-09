# WordNest 1.2 Parser Contract

This document defines the parser-core contract for WordNest 1.2.

WordNest 1.2 is a parser stabilization release. Future changes should make the
same user input produce more stable, explainable, and Word-friendly structure.
Do not use parser work as a path to add DOCX export, AI rewriting, backend
services, template marketplaces, or full Word-editor features.

## Scope

The parser is responsible for:

- Preserving the user's original meaning and text content.
- Cleaning and normalizing formatting structure.
- Producing deterministic blocks for preview, copy-to-Word, HTML export, tests,
  and rule debugging.
- Keeping Chinese document structure rules explainable and regression-tested.

The parser is not responsible for:

- Rewriting, polishing, summarizing, or correcting user content.
- Creating live Word fields such as TOC, captions, cross references, headers, or
  page-number sections.
- Exporting DOCX.
- Calling AI services, network APIs, storage, browser DOM APIs, or React render
  APIs.

## Primary Entry

Use `parseToBlocks(input, options)` as the parser-core API.

```ts
parseToBlocks(input: string, options?: ParseToBlocksOptions): ParseToBlocksResult
```

`ParseToBlocksOptions` currently supports:

- `profileId?: string`

`ParseToBlocksResult` returns the existing `DocumentModel` fields plus metadata:

- `blocks`
- `stableBlocks`
- `cleanedMarkdown`
- `debugRows`
- `classification`
- `metadata.profileId`
- `metadata.parserVersion`, currently `"1.2"`

Contract expectations:

- Deterministic for the same `input` and `options`.
- Pure parser work only.
- Does not depend on React rendering.
- Does not touch DOM, clipboard, localStorage, browser globals, or network APIs.
- Does not mutate input.
- Adds metadata only on the new parser-core API.

The exported file `src/lib/parseToBlocks.ts` is the stable import location for
new parser-core consumers. Its implementation may re-export from the internal
parser module, but callers should not depend on that detail.

## Compatibility Entry

`parseMarkdown(input, options)` remains a backward-compatible wrapper.

Compatibility expectations:

- It must continue returning the original `DocumentModel` shape.
- It must not include parser-core metadata.
- Existing runtime consumers may keep using it.
- Its output fields must stay compatible with `parseToBlocks(input, options)`
  for `blocks`, `stableBlocks`, `cleanedMarkdown`, and `debugRows`.

Do not remove or rename `parseMarkdown` during the 1.2 stabilization work.

## Pipeline

Current app flow:

1. `App` receives raw pasted text.
2. `cleanText` performs input cleanup.
3. `parseMarkdown` is called with the selected profile.
4. The parser preprocesses text by profile and uses `markdown-it` for Markdown
   structure.
5. Legacy `DocumentBlock[]` is produced as `blocks`.
6. `classifyLines` produces `debugRows`.
7. `buildStableBlocks` produces deterministic `stableBlocks`.
8. Preview, copy-to-Word, and HTML export prefer `stableBlocks`.
9. Markdown export intentionally remains based on `blocks`.
10. The debug panel consumes `debugRows` and `stableBlocks`.

This flow should stay stable unless a future phase explicitly changes the
contract.

## Data Model Contract

### `blocks`

`blocks` is the legacy render-compatible block list.

Use it for compatibility and for Markdown export. Avoid adding new production
behavior that depends only on `blocks` when `stableBlocks` already carries the
same structure.

### `stableBlocks`

`stableBlocks` is the preferred structured parser output.

Use it for:

- Browser preview.
- Copy-to-Word HTML.
- HTML export.
- Parser regression tests.
- Debugging and explainability.

Current stable block families include:

- `title`
- `heading`
- `paragraph`
- `list`
- `table`
- `blockquote`
- `code`
- `signature`
- `keywords`
- `abstract`
- `references`

Rendering code may convert `StableBlock` values back into renderable
`DocumentBlock` values, but `stableBlocks` should remain the preferred source
when present.

### `cleanedMarkdown`

`cleanedMarkdown` is the parser's Markdown-oriented intermediate output.

It is useful for compatibility and diagnostics. Markdown export is intentionally
conservative and should remain unchanged unless a future task explicitly changes
that contract.

### `debugRows`

`debugRows` explains line-level classification.

Each row should identify:

- Original and normalized text.
- Classification.
- Rule id.
- Confidence.
- Intended output.
- Reasons.
- Optional semantic role.

Debug rows are for explainability and regression diagnosis, not for user-facing
copy changes.

## Semantic Roles

WordNest 1.2 supports these lightweight semantic roles:

- `abstractTitle`
- `abstractBody`
- `keywords`
- `caption`
- `referenceHeading`
- `referenceItem`

Role contract:

- Roles are conservative structural hints.
- Roles must not rewrite or normalize the user's meaning.
- Roles should be optional and fallback-safe.
- Rendering should degrade to ordinary headings or paragraphs when a role is not
  recognized.
- Caption blocks may include `metadata.captionKind` as `"figure"` or `"table"`.
- Reference items may be grouped into a `references` stable block.

Do not add new roles casually. New roles should have fixtures, regression tests,
and a clear rendering fallback.

## Module Boundaries

Keep parser responsibilities separated:

- `src/lib/chineseStructureRules.ts`
  - Pure rule helpers and structural predicates.
  - No parser orchestration, rendering, DOM, or React logic.

- `src/lib/documentPipeline.ts`
  - Line normalization, classification, heading scoring, debug rows, and stable
    block construction.
  - May use Chinese structure rules.
  - Should stay deterministic and test-friendly.

- `src/lib/parseMarkdown.ts`
  - Parser orchestration, profile-aware preprocessing, Markdown token parsing,
    `parseToBlocks`, and `parseMarkdown` compatibility.
  - Should not become a renderer or UI module.

- `src/lib/parseToBlocks.ts`
  - Stable import surface for parser-core consumers.

- `src/lib/copyForWord.ts`
  - Rendering preview and Word-friendly HTML.
  - Should prefer `stableBlocks` when available and fall back to `blocks`.

- `src/lib/exportFiles.ts`
  - File download helpers.
  - HTML export receives already-rendered HTML.
  - Markdown export currently uses `blocks`.

## Output Contract

Preview, copy-to-Word, and HTML export should stay aligned:

- Prefer `stableBlocks` as the structured source.
- Preserve headings, paragraphs, lists, tables, blockquotes, and code blocks.
- Preserve user text.
- Use simple, semantic, Word-friendly HTML.
- Keep semantic-role rendering conservative.
- Fall back safely when optional role metadata is absent.

Markdown export is intentionally separate:

- Keep it based on the existing Markdown-safe path unless explicitly changed.
- Do not force Markdown export through the stable renderer without a dedicated
  task and tests.

## Testing Contract

Parser changes should be protected by focused regression tests.

Existing test locations:

- `src/tests/parser.test.ts`
- `src/tests/fixtures/`
- `tests/documentPipeline.test.ts`
- `tests/fixtures/`

Good parser tests should assert meaningful behavior without becoming brittle:

- Block type.
- Heading level where relevant.
- Key text preservation.
- Abstract and keyword preservation.
- Reference preservation.
- Caption role and caption kind where relevant.
- Table detection or table text preservation.
- Government signature/date preservation.
- Ordinary AI paragraphs are not over-classified as headings.
- `parseToBlocks` compatibility with `parseMarkdown`.
- Rendering from `stableBlocks` when available.

Prefer flexible assertions such as partial object matches, array containment,
role checks, and text inclusion. Avoid matching every field unless the exact
shape is the contract being tested.

Run these checks after parser-contract changes that affect code:

```bash
npm test
npm run build
```

For docs-only changes, running the same checks is still acceptable when the
worktree is already active, but the documentation must not require behavior
changes.

## Production Build Contract

`src/tests` is excluded from `tsconfig.app.json` so parser fixtures and Vitest
files do not become part of the production app build.

This is intentional. Keep production app code, parser code, and test-only
fixtures separate.

## Change Rules

When modifying parser behavior:

- Start from the smallest rule or pipeline change that solves the regression.
- Preserve existing runtime behavior unless the task explicitly asks to change
  it.
- Update or add fixtures only for realistic document cases.
- Keep fixtures concise.
- Keep `parseToBlocks` pure and deterministic.
- Keep `parseMarkdown` backward compatible.
- Keep preview, copy-to-Word, and HTML export aligned around `stableBlocks`.
- Do not modify UI, templates, copy/export behavior, or dependencies unless the
  task explicitly requires it.

When in doubt, protect the parser contract before expanding product scope.
