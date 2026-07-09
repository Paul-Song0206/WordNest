import type {
  DocumentBlock,
  DocumentModel,
  DocumentTemplate,
  EffectiveRoleStyle,
  StableBlock,
  StyleRole,
  WordCopyMode,
} from "../types/document";

type CopyResult = {
  ok: boolean;
  message: string;
};

type HeadingStyleRole = Exclude<StyleRole, "body" | "meta">;
type RenderMode = "preview" | WordCopyMode;

function pageSetupStyle(template: DocumentTemplate): string {
  if (!template.pageSetup) {
    return "";
  }

  const { marginTop, marginBottom, marginLeft, marginRight, gutter } = template.pageSetup;
  const effectiveLeftMargin = gutter ? addCssLengths(marginLeft, gutter) : marginLeft;

  return `<style>@page { margin: ${marginTop} ${marginRight} ${marginBottom} ${effectiveLeftMargin}; }</style>`;
}

function addCssLengths(first: string, second: string): string {
  const firstCm = parseCm(first);
  const secondCm = parseCm(second);

  if (firstCm === null || secondCm === null) {
    return first;
  }

  return `${firstCm + secondCm}cm`;
}

function parseCm(value: string): number | null {
  const match = value.match(/^(\d+(?:\.\d+)?)cm$/);
  return match ? Number.parseFloat(match[1]) : null;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrapWithStyle(content: string, style: string): string {
  return `<div style="${style}">${content}</div>`;
}

function blockStyle(base: string, extra?: string): string {
  return extra ? `${base}; ${extra}` : base;
}

function blockClass(role: string | undefined): string {
  return role ? ` class="official-${role}"` : "";
}

function roleTypographyStyle(style: EffectiveRoleStyle | undefined): string {
  if (!style) {
    return "";
  }

  return [
    style.fontFamily ? `font-family:${style.fontFamily}` : "",
    style.fontSize ? `font-size:${style.fontSize}` : "",
    style.fontWeight ? `font-weight:${style.fontWeight}` : "",
    style.textAlign ? `text-align:${style.textAlign}` : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function applyRoleTypography(baseStyle: string, roleStyle: EffectiveRoleStyle | undefined): string {
  const extra = roleTypographyStyle(roleStyle);
  return extra ? blockStyle(baseStyle, extra) : baseStyle;
}

function annotateLatinRuns(html: string, latinFontFamily: string | undefined): string {
  if (!latinFontFamily) {
    return html;
  }

  let codeDepth = 0;

  return html
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (!part) {
        return part;
      }

      if (part.startsWith("<")) {
        const tag = part.toLowerCase();
        if (/^<(code|pre)(\s|>)/.test(tag)) {
          codeDepth += 1;
        } else if (/^<\/(code|pre)>/.test(tag)) {
          codeDepth = Math.max(0, codeDepth - 1);
        }
        return part;
      }

      return codeDepth > 0 ? part : annotateLatinText(part, latinFontFamily);
    })
    .join("");
}

function annotateLatinText(text: string, latinFontFamily: string): string {
  return text
    .split(/(&#?\w+;)/g)
    .map((part) => {
      if (/^&#?\w+;$/.test(part)) {
        return part;
      }

      return part.replace(
        /[A-Za-z0-9]+(?:[A-Za-z0-9\s.,:;!?'"()[\]{}+\-/%@#]*[A-Za-z0-9])?/g,
        (match) => `<span style="font-family:${latinFontFamily}">${match}</span>`,
      );
    })
    .join("");
}

function renderTable(
  block: Extract<DocumentBlock, { type: "table" }>,
  template: DocumentTemplate,
): string {
  const { table } = template.styles;
  const latinFontFamily = template.styles.document.latinFontFamily;
  const isThreeLine = table.layout === "three-line";
  const commonCellStyle = `padding:${table.cellPadding}; font-size:${table.fontSize}; font-family:${table.fontFamily}; text-indent:0`;
  const tableStyle = isThreeLine
    ? `width:100%; border-collapse:collapse; margin:${table.margin}; border-top:${table.border}; border-bottom:${table.border}`
    : `width:100%; border-collapse:collapse; margin:${table.margin}`;
  const headerCellStyle = isThreeLine
    ? `${commonCellStyle}; font-weight:700; border-bottom:${table.border}`
    : `${commonCellStyle}; font-weight:700; border:${table.border}`;
  const bodyCellStyle = isThreeLine
    ? `${commonCellStyle}; border:none`
    : `${commonCellStyle}; border:${table.border}`;

  const headerHtml = block.headers.length
    ? `<thead><tr>${block.headers
        .map((header) => `<th style="${headerCellStyle}">${annotateLatinRuns(header, latinFontFamily)}</th>`)
        .join("")}</tr></thead>`
    : "";
  const bodyHtml = `<tbody>${block.rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td style="${bodyCellStyle}">${annotateLatinRuns(cell, latinFontFamily)}</td>`)
          .join("")}</tr>`,
    )
    .join("")}</tbody>`;

  return `<table style="${tableStyle}">${headerHtml}${bodyHtml}</table>`;
}

function renderConservativeTable(block: Extract<DocumentBlock, { type: "table" }>): string {
  const cellStyle = "padding:4pt 6pt; border:1px solid #666; font-size:12pt; font-family:SimSun, 宋体, serif; text-indent:0";
  const headerHtml = block.headers.length
    ? `<thead><tr>${block.headers.map((header) => `<th style="${cellStyle}; font-weight:700">${header}</th>`).join("")}</tr></thead>`
    : "";
  const bodyHtml = `<tbody>${block.rows
    .map((row) => `<tr>${row.map((cell) => `<td style="${cellStyle}">${cell}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;

  return `<table style="width:100%; border-collapse:collapse; margin:0 0 8pt">${headerHtml}${bodyHtml}</table>`;
}

function renderConservativeBlock(block: DocumentBlock): string {
  const paragraphStyle =
    "margin:0 0 8pt; line-height:1.5; text-indent:2em; font-size:12pt; font-family:SimSun, 宋体, serif";
  const noIndentParagraphStyle = blockStyle(paragraphStyle, "text-indent:0");
  const headingStyle = (level: 1 | 2 | 3 | 4) =>
    `margin:${level === 1 ? "0 0 12pt" : "10pt 0 6pt"}; line-height:1.4; font-family:SimHei, 黑体, sans-serif; font-weight:700; font-size:${
      level === 1 ? "16pt" : level === 2 ? "14pt" : level === 3 ? "12pt" : "10.5pt"
    }; text-indent:0`;

  switch (block.type) {
    case "heading":
      return `<h${block.level} style="${headingStyle(block.level)}">${block.html}</h${block.level}>`;
    case "paragraph": {
      const style =
        block.role === "meta" ||
        block.role === "keyword" ||
        block.role === "keywords" ||
        block.role === "abstract" ||
        block.role === "abstractBody" ||
        block.role === "referenceItem" ||
        block.role === "salutation" ||
        block.role === "numbered-paragraph"
          ? noIndentParagraphStyle
          : paragraphStyle;
      return `<p style="${style}">${block.html}</p>`;
    }
    case "blockquote":
      return `<blockquote style="margin:0 0 8pt; padding:4pt 8pt; border-left:2pt solid #999; font-size:12pt; line-height:1.5; font-family:SimSun, 宋体, serif">${block.html}</blockquote>`;
    case "code":
      return `<pre style="margin:0 0 8pt; font-family:Consolas, monospace; font-size:10.5pt; line-height:1.4; white-space:pre-wrap"><code>${escapeHtml(block.text)}</code></pre>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      const items = block.items.map((item) => `<li style="margin:0 0 4pt">${item}</li>`).join("");
      return `<${tag} style="margin:0 0 8pt; padding-left:1.5em; line-height:1.5; font-size:12pt; font-family:SimSun, 宋体, serif">${items}</${tag}>`;
    }
    case "table":
      return renderConservativeTable(block);
  }
}

function renderBlock(block: DocumentBlock, template: DocumentTemplate, mode: RenderMode): string {
  if (mode === "conservative") {
    return renderConservativeBlock(block);
  }

  const styles = template.styles;
  const getLatinFontFamily = (role?: StyleRole) =>
    (role ? styles.roleStyles?.[role]?.latinFontFamily : undefined) ?? styles.document.latinFontFamily;
  const inlineHtml = (html: string, role?: StyleRole) => annotateLatinRuns(html, getLatinFontFamily(role));
  const paragraphStyle = blockStyle(
    `margin:${styles.paragraph.margin}; line-height:${styles.paragraph.lineHeight}; text-indent:${styles.paragraph.textIndent}; font-size:${styles.paragraph.fontSize}; font-family:${styles.paragraph.fontFamily}${
      styles.paragraph.fontWeight ? `; font-weight:${styles.paragraph.fontWeight}` : ""
    }${styles.paragraph.textAlign ? `; text-align:${styles.paragraph.textAlign}` : ""}`,
  );
  const metaStyle = applyRoleTypography(
    blockStyle(paragraphStyle, "text-indent:0; text-align:center"),
    styles.roleStyles?.meta,
  );
  const keywordStyle = blockStyle(paragraphStyle, "text-indent:0");
  const salutationStyle = blockStyle(paragraphStyle, "text-indent:0");
  const numberedParagraphStyle = blockStyle(paragraphStyle, "list-style:none; padding-left:0");

  const headingBase = (role: HeadingStyleRole) => {
    const heading = styles.headings[getHeadingStyleLevel(role)];
    return `margin:${heading.margin}; line-height:${heading.lineHeight}; font-size:${heading.fontSize}; font-family:${heading.fontFamily}; font-weight:${heading.fontWeight}; text-align:${heading.textAlign ?? "left"}`;
  };

  const listStyle = `margin:${styles.list.margin}; padding-left:${styles.list.paddingLeft}; line-height:${styles.list.lineHeight}; font-size:${styles.list.fontSize}; font-family:${styles.list.fontFamily}`;
  const quoteStyle = `margin:${styles.blockquote.margin}; padding:${styles.blockquote.padding}; border-left:${styles.blockquote.borderLeft}; background:${mode === "preview" ? styles.blockquote.previewBackground : "transparent"}; line-height:${styles.blockquote.lineHeight}; font-size:${styles.blockquote.fontSize}; font-family:${styles.blockquote.fontFamily}`;
  const codeStyle = `margin:${styles.code.margin}; padding:${styles.code.padding}; font-family:${styles.code.fontFamily}; font-size:${styles.code.fontSize}; line-height:${styles.code.lineHeight}; background:${mode === "preview" ? styles.code.previewBackground : "transparent"}; white-space:pre-wrap`;

  switch (block.type) {
    case "heading": {
      const role = getHeadingStyleRole(block);
      return `<h${block.level}${blockClass(block.role)} style="${headingBase(role)}">${inlineHtml(block.html, role)}</h${block.level}>`;
    }
    case "paragraph":
      if (block.role === "meta") {
        return `<p${blockClass(block.role)} style="${metaStyle}">${inlineHtml(block.html, "meta")}</p>`;
      }

      if (block.role === "keyword" || block.role === "keywords") {
        return `<p${blockClass(block.role)} style="${keywordStyle}">${inlineHtml(block.html, "body")}</p>`;
      }

      if (block.role === "abstract" || block.role === "abstractBody" || block.role === "reference" || block.role === "referenceItem") {
        return `<p${blockClass(block.role)} style="${keywordStyle}">${inlineHtml(block.html, "body")}</p>`;
      }

      if (block.role === "abstractTitle" || block.role === "caption") {
        return `<p${blockClass(block.role)} style="${paragraphStyle}">${inlineHtml(block.html, "body")}</p>`;
      }

      if (block.role === "salutation") {
        return `<p${blockClass(block.role)} style="${salutationStyle}">${inlineHtml(block.html, "body")}</p>`;
      }

      if (block.role === "numbered-paragraph") {
        return `<p${blockClass(block.role)} style="${numberedParagraphStyle}">${inlineHtml(block.html, "body")}</p>`;
      }

      return `<p style="${paragraphStyle}">${inlineHtml(block.html, "body")}</p>`;
    case "blockquote":
      return `<blockquote style="${quoteStyle}">${inlineHtml(block.html)}</blockquote>`;
    case "code":
      return `<pre style="${codeStyle}"><code>${escapeHtml(block.text)}</code></pre>`;
    case "list": {
      if (block.ordered && styles.list.numericHandling === "plain") {
        return block.items
          .map(
            (item, index) =>
              `<p class="numbered-paragraph" style="${numberedParagraphStyle}">${inlineHtml(`${index + 1}.`, "body")} ${inlineHtml(item, "body")}</p>`,
          )
          .join("");
      }

      const tag = block.ordered ? "ol" : "ul";
      const items = block.items
        .map((item) => `<li style="margin:${styles.list.itemMargin}">${inlineHtml(item)}</li>`)
        .join("");
      return `<${tag} style="${listStyle}">${items}</${tag}>`;
    }
    case "table":
      return renderTable(block, template);
  }
}

function getHeadingStyleRole(block: Extract<DocumentBlock, { type: "heading" }>): HeadingStyleRole {
  if (block.role === "title") {
    return "title";
  }

  if (block.role === "heading1") {
    return "heading1";
  }

  if (block.role === "heading2") {
    return "heading2";
  }

  if (block.role === "heading3") {
    return "heading3";
  }

  if (block.role === "official-h1") {
    return "heading1";
  }

  if (block.role === "official-h2") {
    return "heading2";
  }

  if (block.role === "official-h3") {
    return "heading3";
  }

  if (block.role === "abstractTitle" || block.role === "referenceHeading") {
    return "heading1";
  }

  if (block.level === 1) {
    return "heading1";
  }

  if (block.level === 2) {
    return "heading2";
  }

  return "heading3";
}

function getHeadingStyleLevel(role: HeadingStyleRole): 1 | 2 | 3 | 4 {
  switch (role) {
    case "title":
      return 1;
    case "heading1":
      return 2;
    case "heading2":
      return 3;
    case "heading3":
      return 4;
  }
}

function stableBlockToDocumentBlocks(block: StableBlock): DocumentBlock[] {
  switch (block.type) {
    case "title":
      return [
        {
          type: "heading",
          level: 1,
          text: block.text,
          html: escapeHtml(block.text),
          role: "title",
        },
      ];
    case "heading":
      return [
        {
          type: "heading",
          level: block.level,
          text: block.text,
          html: escapeHtml(block.text),
          role: block.role,
        },
      ];
    case "paragraph":
      return [
        {
          type: "paragraph",
          text: block.text,
          html: escapeHtml(block.text),
          role: block.role,
        },
      ];
    case "keywords":
      return [
        {
          type: "paragraph",
          text: block.text,
          html: escapeHtml(block.text),
          role: "keywords",
        },
      ];
    case "abstract":
      return [
        {
          type: "paragraph",
          text: block.text,
          html: escapeHtml(block.text),
          role: "abstractBody",
        },
      ];
    case "signature":
      return block.lines.map((line) => ({
        type: "paragraph",
        text: line,
        html: escapeHtml(line),
        role: "meta",
      }));
    case "references":
      return block.items.map((item) => ({
        type: "paragraph",
        text: item,
        html: escapeHtml(item),
        role: "referenceItem",
      }));
    case "list":
      return [
        {
          type: "list",
          ordered: block.ordered,
          items: block.items.map(escapeHtml),
        },
      ];
    case "table": {
      const [headers = [], ...rows] = block.rows;
      return [
        {
          type: "table",
          headers: headers.map(escapeHtml),
          rows: rows.map((row) => row.map(escapeHtml)),
        },
      ];
    }
    case "blockquote":
      return [
        {
          type: "blockquote",
          text: block.text,
          html: escapeHtml(block.text),
        },
      ];
    case "code":
      return [
        {
          type: "code",
          text: block.text,
        },
      ];
  }
}

function getRenderableBlocks(documentModel: DocumentModel): DocumentBlock[] {
  if (documentModel.stableBlocks.length === 0) {
    return documentModel.blocks;
  }

  return documentModel.stableBlocks.flatMap(stableBlockToDocumentBlocks);
}

function renderDocument(
  documentModel: DocumentModel,
  template: DocumentTemplate,
  mode: RenderMode,
): string {
  const content = getRenderableBlocks(documentModel).map((block) => renderBlock(block, template, mode)).join("");
  const wordWrapperStyle =
    mode === "conservative"
      ? "color:#111827; background:transparent; padding:0; font-family:SimSun, 宋体, serif"
      : `color:${template.styles.document.color}; background:transparent; padding:0; font-family:${template.styles.document.fontFamily}`;
  const wrapperStyle =
    mode === "preview"
      ? `color:${template.styles.document.color}; background:${template.styles.document.previewBackground}; padding:${template.styles.document.previewPadding}; font-family:${template.styles.document.fontFamily}`
      : wordWrapperStyle;
  return `${mode !== "preview" ? pageSetupStyle(template) : ""}${wrapWithStyle(content, wrapperStyle)}`;
}

export function renderPreviewHtml(documentModel: DocumentModel, template: DocumentTemplate): string {
  return renderDocument(documentModel, template, "preview");
}

export function renderWordHtml(
  documentModel: DocumentModel,
  template: DocumentTemplate,
  copyMode: WordCopyMode = "styled",
): string {
  return renderDocument(documentModel, template, copyMode);
}

export async function copyForWord(wordHtml: string, plainText: string): Promise<CopyResult> {
  if (copyBySelection(wordHtml, plainText)) {
    return {
      ok: true,
      message: "已复制适合 Word 粘贴的富文本。",
    };
  }

  try {
    if (navigator.clipboard && "ClipboardItem" in window) {
      const item = new ClipboardItem({
        "text/html": new Blob([wordHtml], { type: "text/html" }),
        "text/plain": new Blob([plainText], { type: "text/plain" }),
      });

      await navigator.clipboard.write([item]);
      return {
        ok: true,
        message: "已复制适合 Word 粘贴的富文本。",
      };
    }

    await navigator.clipboard.writeText(plainText);
    return {
      ok: true,
      message: "当前浏览器不支持富文本复制，已复制纯文本。",
    };
  } catch {
    try {
      await navigator.clipboard.writeText(plainText);
      return {
        ok: true,
        message: "富文本复制失败，已改为复制纯文本。",
      };
    } catch {
      return {
        ok: false,
        message: "复制失败，请检查浏览器剪贴板权限。",
      };
    }
  }
}

function copyBySelection(wordHtml: string, plainText: string): boolean {
  if (!document.body || typeof document.execCommand !== "function") {
    return false;
  }

  const container = document.createElement("div");
  container.setAttribute("contenteditable", "true");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "1px";
  container.style.height = "1px";
  container.style.overflow = "hidden";
  container.innerHTML = wordHtml || escapeHtml(plainText).replace(/\n/g, "<br>");

  document.body.appendChild(container);

  const selection = window.getSelection();
  if (!selection) {
    container.remove();
    return false;
  }

  const previousRanges = Array.from({ length: selection.rangeCount }, (_, index) =>
    selection.getRangeAt(index).cloneRange(),
  );

  try {
    const range = document.createRange();
    range.selectNodeContents(container);
    selection.removeAllRanges();
    selection.addRange(range);

    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    selection.removeAllRanges();
    previousRanges.forEach((range) => selection.addRange(range));
    container.remove();
  }
}
