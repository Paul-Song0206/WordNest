\# AGENTS.md



\## Project Overview



This project is an AI text layout cleaner.



The goal is to help users paste AI-generated Markdown, semi-Markdown, or plain text and convert it into clean, Word-friendly rich text.



The target users are mainly Chinese students, researchers, and office users who need to prepare essays, reports, research proposals, defense scripts, business documents, and meeting notes.



\## Product Boundary



This project is NOT:

\- A full Markdown editor

\- A full Word editor

\- An AI writing tool

\- A text rewriting or polishing tool



This project IS:

\- A formatting cleaner

\- A structure normalizer

\- A Word-friendly rich text generator

\- A Chinese document layout helper



Never rewrite, summarize, polish, or change the meaning of the user's content unless explicitly requested.



\## Core Priorities



1\. Preserve the user's original meaning.

2\. Clean messy formatting from AI-generated text.

3\. Improve Chinese document layout.

4\. Generate simple, semantic, Word-friendly HTML.

5\. Keep the MVP fully client-side.

6\. Prefer stable functionality over decorative UI.



\## Technical Stack



Use:

\- React

\- Vite

\- TypeScript

\- Tailwind CSS

\- markdown-it or remark for Markdown parsing



For the MVP:

\- No backend

\- No database

\- No login system

\- No payment

\- No cloud sync

\- No external AI API

\- No uploading user content



User content must stay in the browser.



\## Chinese Formatting Rules



Chinese document formatting is a first-class requirement.



Support and carefully handle patterns such as:

\- 第一部分：xxx

\- 第二部分：xxx

\- 一、xxx

\- 二、xxx

\- （一）xxx

\- （二）xxx

\- 1. xxx

\- 1、xxx

\- 第一，xxx

\- 第二，xxx



Be careful when distinguishing between:

\- Real headings

\- List items

\- Emphasis sentences

\- Normal paragraphs

\- Defense or speech-style short lines



Do not blindly convert every short line into a heading.



\## Word-Friendly Output Rules



When implementing "Copy for Word":

\- Prefer semantic HTML tags:

&#x20; - h1, h2, h3

&#x20; - p

&#x20; - ul, ol, li

&#x20; - table, tr, th, td

&#x20; - blockquote

&#x20; - pre, code

\- Avoid complex nested div structures.

\- Avoid complex web-only CSS.

\- Prefer simple inline styles or simple CSS that Microsoft Word is likely to preserve.

\- Copy both text/html and text/plain when possible.

\- Always provide plain text fallback.



\## Code Organization



Keep code modular and readable.



Suggested structure:



src/

&#x20; App.tsx

&#x20; components/

&#x20;   EditorPanel.tsx

&#x20;   PreviewPanel.tsx

&#x20;   TemplateSelector.tsx

&#x20;   ActionToolbar.tsx

&#x20;   PrivacyNote.tsx

&#x20; lib/

&#x20;   cleanText.ts

&#x20;   parseMarkdown.ts

&#x20;   copyForWord.ts

&#x20;   exportFiles.ts

&#x20;   templates.ts

&#x20; types/

&#x20;   document.ts

&#x20; main.tsx

&#x20; index.css

README.md



Do not put all business logic inside React components.



\## Implementation Style



\- Keep the code simple and maintainable.

\- Use clear rule-based heuristics.

\- Add comments for important text-cleaning rules.

\- Do not overengineer.

\- Do not add unnecessary dependencies.

\- Do not modify unrelated files.

\- Run build, lint, or typecheck commands when available.

\- Report what changed and how to test it.



\## Done Criteria



A task is done only when:

\- The app runs locally.

\- The main feature works with Chinese AI-generated text.

\- The preview is visibly cleaner than raw pasted text.

\- Copy for Word works with rich text and plain text fallback.

\- Templates visibly affect the document style.

\- Export features work if included in the task.

\- README explains setup, usage, known limitations, and roadmap.

