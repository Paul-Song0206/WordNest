# AI Text Layout Cleaner

A fully client-side MVP for cleaning AI-generated Chinese text into a cleaner, Word-friendly layout.

## What It Does

- Paste AI-generated Markdown, semi-Markdown, or plain text
- Normalize messy formatting without changing meaning
- Detect common Chinese headings, paragraphs, lists, blockquotes, code blocks, and simple tables
- Preview the cleaned result in the browser
- Copy Word-friendly HTML with a plain text fallback
- Support multiple formatting profiles for different document scenarios

## Formatting Profiles

The app currently includes:

- `general-clean`: general cleanup for notes and working drafts
- `official-document`: formal public-document / notice style
- `report-format`: general report / paper-style formatting
- `thesis`: thesis / academic paper formatting

### Thesis Profile Scope

The `thesis` profile is intended for:

- Graduation theses
- Academic papers
- Degree theses

It preserves the original wording, formulas, citations, tables, and paragraph meaning. It does not rewrite, summarize, polish, or normalize reference content.

### Thesis Profile Rules Covered Directly

The profile directly affects:

- Body font, size, line spacing, and first-line indentation
- Heading levels 1-4
- English font fallback inside body text and headings
- List spacing
- Table rendering, with a three-line-table oriented style

It also supports parsing thesis-style numeric headings such as:

- `1 Title`
- `1.1 Title`
- `1.1.1 Title`
- `1.1.1.1 Title`

### Thesis Rules Documented for Word Follow-Up

Some thesis requirements are Word-only layout features and are documented in the UI instead of being auto-generated from clipboard HTML:

- Margins, gutter, mirrored margins, and section settings
- Headers, footers, and page numbers
- Table of contents fields
- Figure/table caption numbering and cross references
- Final field refresh and “Error!” checks
- Comment / tracked-changes cleanup

After pasting into Word, use `Ctrl+A` then `F9` to refresh all fields.

## What It Does Not Do

- Rewrite, summarize, polish, or correct content
- Export DOCX in v1
- Send content to a backend or AI API
- Save content to a database or cloud service
- Fully automate Word section headers, mirrored margins, TOC fields, or cross references

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- markdown-it

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

## Vercel Deployment

Use the standard Vite static deployment settings:

- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## Usage

1. Paste raw text into the editor.
2. Choose a formatting profile.
3. Review the preview.
4. Click `Copy for Word`.
5. Paste into Microsoft Word.
6. If using the thesis profile, apply the documented page setup / header / TOC steps in Word.

Optional exports:

- Download cleaned Markdown
- Download Word-friendly HTML

## Known Limitations

- Heading detection is conservative and heuristic-based.
- Complex nested lists are flattened in some cases.
- Simple Markdown pipe tables are supported, but advanced tables are not.
- Browser preview is only an approximation of Word output.
- Rich clipboard support depends on the browser environment.
- The thesis profile cannot create live Word-only fields such as TOC, cross references, or mirrored page sections by itself.

## Roadmap

Possible v2 items:

- DOCX export
- More advanced Chinese legal/report/thesis heading heuristics
- Better nested list handling
- Explicit figure / table caption block helpers
- Saved sessions and custom templates
