import MarkdownIt from "markdown-it";
import type {
  DocumentBlock,
  DocumentModel,
  HeadingBlock,
  ListBlock,
  ParagraphBlock,
  TableBlock,
} from "../types/document";

type MarkdownToken = {
  type: string;
  tag: string;
  content: string;
  info: string;
};

type HeadingDetectionContext = {
  lineIndex: number;
  previousLine: string | null;
  nextLine: string | null;
};

type ParseMarkdownOptions = {
  profileId?: string;
};

type ClassifiedLine = {
  kind:
    | "title"
    | "meta"
    | "salutation"
    | "h1"
    | "h2"
    | "h3"
    | "numbered-paragraph"
    | "paragraph"
    | "markdown"
    | "blank";
  text: string;
};

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
  breaks: false,
});

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

function isCodeFence(line: string): boolean {
  return /^(```|~~~)/.test(line.trim());
}

function isQuote(line: string): boolean {
  return /^\s*>/.test(line);
}

function isBulletList(line: string): boolean {
  return /^\s*[-*+]\s+/.test(line);
}

function isOrderedList(line: string): boolean {
  return /^\s*\d+[.)]\s+/.test(line);
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?[\s:-]+(\|[\s:-]+)+\|?\s*$/.test(line);
}

function isTableRow(line: string): boolean {
  return /^\s*\|.+\|\s*$/.test(line);
}

function isMarkdownHeading(line: string): boolean {
  return /^\s*#{1,6}\s+/.test(line);
}

function looksLikeFullSentence(line: string): boolean {
  return /[。！？；]$/.test(line.trim());
}

function isOfficialNumberedParagraph(line: string): boolean {
  return /^(?:\d+[.)、．]|[（(]\d+[)）])\s*\S+/.test(line.trim());
}

function isOfficialH1(line: string): boolean {
  return /^[一二三四五六七八九十]+、.{2,}$/.test(line.trim());
}

function isOfficialH2(line: string): boolean {
  return /^（[一二三四五六七八九十]+）.{2,}$/.test(line.trim());
}

function isOfficialH3(line: string): boolean {
  return /^(一是|二是|三是|四是|五是|六是|首先|其次|再次|最后)[要应需可把以在对从，、].*/.test(
    line.trim(),
  );
}

function isOfficialSalutation(line: string): boolean {
  const trimmed = line.trim();
  return /^[\u4e00-\u9fff、，和及与]{2,16}[：:]$/.test(trimmed) && !/[。！？；]/.test(trimmed);
}

function isOfficialMeta(line: string): boolean {
  const trimmed = line.trim();

  return (
    /^（?\d{4}年\d{1,2}月\d{1,2}日）?$/.test(trimmed) ||
    /^(汇报人|发言人|报告人|作者|单位|时间)[：:]\S+/.test(trimmed)
  );
}

function isOfficialTitleCandidate(line: string, lineIndex: number, nextLine: string | null): boolean {
  const trimmed = line.trim();

  return (
    lineIndex === 0 &&
    trimmed.length >= 6 &&
    trimmed.length <= 36 &&
    !/[，。！？；：:]/.test(trimmed) &&
    !isOfficialH1(trimmed) &&
    !isOfficialH2(trimmed) &&
    !isOfficialH3(trimmed) &&
    !isOfficialNumberedParagraph(trimmed) &&
    (nextLine?.trim().length ?? 0) === 0
  );
}

function escapeOrderedListMarker(line: string): string {
  return line.replace(/^(\s*)(\d+)([.)])(\s*)/, "$1$2\\$3$4");
}

function isDevelopmentMode(): boolean {
  return Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);
}

function isAcademicProfile(profileId: string | undefined): boolean {
  return profileId === "thesis" || profileId === "ruc-undergraduate-thesis-2022";
}

function isAcademicKeywordLine(line: string): boolean {
  return /^(?:\u5173\s*\u952e\s*\u8bcd|keywords?|key\s+words?)\s*[:\uff1a]\s*.*$/i.test(
    line.trim(),
  );
}

function isAcademicAbstractHeading(line: string): boolean {
  return /^(?:(?:\u4e2d\u6587|\u82f1\u6587)?\u6458\s*\u8981|abstract)$/i.test(line.trim());
}

function isAcademicFrontMatterHeading(line: string): boolean {
  return isAcademicAbstractHeading(line) || /^(?:\u76ee\s*\u5f55|contents?)$/i.test(line.trim());
}

function isAcademicSentenceEnd(line: string): boolean {
  return /[\u3002\uff01\uff1f\uff1b.!?;]$/.test(line.trim());
}

function startsWithContinuation(line: string): boolean {
  return /^[,.;:!?\u3001\uff0c\u3002\uff1b\uff1a\uff01\uff1f)\]\uff09\u3011\u300b\u201d\u2019]/.test(line.trim()) || /^[a-z]/.test(line.trim());
}

function isCommonAcademicHeadingTitle(text: string): boolean {
  return /^(?:\u5f15\u8a00|\u7eea\u8bba|\u7ed3\u8bba|\u8ba8\u8bba|\u53c2\u8003\u6587\u732e|\u81f4\u8c22|\u9644\u5f55|\u7814\u7a76\u80cc\u666f|\u7814\u7a76\u76ee\u7684\u4e0e\u610f\u4e49|\u7814\u7a76\u65b9\u6cd5\u4e0e\u6280\u672f\u8def\u7ebf|abstract|introduction|background|research background|methodology|methods?|results?|discussion|conclusion|references?|acknowledgements?|acknowledgments?|appendix)$/i.test(
    text.trim(),
  );
}

function getAcademicNumberedHeadingLevel(
  line: string,
  nextLine: string | null,
): 1 | 2 | 3 | 4 | null {
  const trimmed = line.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+){0,3})(?:[.)\u3001])?\s+(.+)$/);

  if (!match) {
    return null;
  }

  const [, marker, title] = match;
  const normalizedTitle = title.trim();
  const depth = marker.split(".").length;
  const level = Math.min(depth, 4) as 1 | 2 | 3 | 4;

  if (!normalizedTitle || normalizedTitle.length > 64) {
    return null;
  }

  if (isAcademicSentenceEnd(normalizedTitle) && !isCommonAcademicHeadingTitle(normalizedTitle)) {
    return null;
  }

  const currentOrdered = trimmed.match(/^(\d+)[.)]\s+/);
  const nextOrdered = nextLine?.trim().match(/^(\d+)[.)]\s+/) ?? null;
  const looksLikeSequentialList =
    depth === 1 &&
    currentOrdered &&
    nextOrdered &&
    Number.parseInt(nextOrdered[1], 10) === Number.parseInt(currentOrdered[1], 10) + 1;

  if (looksLikeSequentialList && !isCommonAcademicHeadingTitle(normalizedTitle)) {
    return null;
  }

  return level;
}

function getAcademicUnnumberedHeadingLevel(line: string): 1 | null {
  const trimmed = line.trim();

  if (isAcademicFrontMatterHeading(trimmed)) {
    return 1;
  }

  if (/^(?:\u5f15\u8a00|\u7eea\u8bba|\u7ed3\u8bba|\u53c2\u8003\u6587\u732e|\u81f4\u8c22|\u9644\u5f55)$/i.test(trimmed)) {
    return 1;
  }

  if (/^(?:introduction|conclusion|references?|acknowledgements?|acknowledgments?|appendix)$/i.test(trimmed)) {
    return 1;
  }

  return null;
}

function shouldPromoteAcademicHeading(
  line: string,
  nextLine: string | null,
  lineIndex = Number.MAX_SAFE_INTEGER,
): 1 | 2 | 3 | 4 | null {
  const trimmed = line.trim();

  if (
    !trimmed ||
    isAcademicKeywordLine(trimmed) ||
    isMarkdownHeading(trimmed) ||
    isQuote(trimmed) ||
    isBulletList(trimmed) ||
    isTableRow(trimmed) ||
    looksLikeFullSentence(trimmed)
  ) {
    return null;
  }

  const detectedLevel = getAcademicNumberedHeadingLevel(trimmed, nextLine) ?? getAcademicUnnumberedHeadingLevel(trimmed);
  if (detectedLevel) {
    return detectedLevel;
  }

  const isTopTitle =
    lineIndex === 0 &&
    trimmed.length >= 6 &&
    trimmed.length <= 48 &&
    (nextLine?.trim().length ?? 0) === 0 &&
    !/[\u3002\uff0c\uff01\uff1f\uff1b\uff1a,!?;:]$/.test(trimmed);

  return isTopTitle ? 1 : null;
}

function isAcademicDocumentTitleCandidate(
  line: string,
  nextLine: string | null,
  hasSeenContent: boolean,
  hasSeenTitle: boolean,
): boolean {
  const trimmed = line.trim();
  const nextTrimmed = nextLine?.trim() ?? "";
  const followedByAcademicStructure =
    nextTrimmed.length === 0 ||
    isAcademicFrontMatterHeading(nextTrimmed) ||
    getAcademicNumberedHeadingLevel(nextTrimmed, null) !== null ||
    getAcademicUnnumberedHeadingLevel(nextTrimmed) !== null;

  return (
    !hasSeenContent &&
    !hasSeenTitle &&
    trimmed.length >= 6 &&
    trimmed.length <= 80 &&
    followedByAcademicStructure &&
    !isAcademicKeywordLine(trimmed) &&
    !isAcademicFrontMatterHeading(trimmed) &&
    getAcademicNumberedHeadingLevel(trimmed, nextLine) === null &&
    getAcademicUnnumberedHeadingLevel(trimmed) === null &&
    !looksLikeFullSentence(trimmed) &&
    !/[\u3002\uff0c\uff01\uff1f\uff1b\uff1a,!?;:]$/.test(trimmed)
  );
}

function getAcademicMarkdownHeadingLevel(level: 1 | 2 | 3 | 4): 1 | 2 | 3 | 4 {
  return Math.min(level + 1, 4) as 1 | 2 | 3 | 4;
}

function isAcademicStructuralLine(line: string | null): boolean {
  if (line === null) {
    return true;
  }

  const trimmed = line.trim();
  return (
    isBlank(trimmed) ||
    isTableSeparator(trimmed) ||
    isTableRow(trimmed) ||
    isQuote(trimmed) ||
    isBulletList(trimmed) ||
    isMarkdownHeading(trimmed) ||
    isAcademicKeywordLine(trimmed) ||
    shouldPromoteAcademicHeading(trimmed, null) !== null
  );
}

function isStrongHeadingPattern(line: string): { level: 1 | 2 | 3 | 4 } | null {
  const trimmed = line.trim();

  if (/^第[0-9一二三四五六七八九十百千万]+(章|部分|节)[\s：:、.]*/.test(trimmed)) {
    return { level: 1 };
  }

  if (/^[0-9]+[\s　]+/.test(trimmed)) {
    return { level: 1 };
  }

  if (/^[一二三四五六七八九十百千万]+[、.．]\s*/.test(trimmed)) {
    return { level: 2 };
  }

  if (/^[（(][一二三四五六七八九十百千万]+[)）]\s*/.test(trimmed)) {
    return { level: 3 };
  }

  if (/^\d+\.\d+\.\d+\.\d+\s+/.test(trimmed)) {
    return { level: 4 };
  }

  if (/^\d+\.\d+\.\d+\s+/.test(trimmed)) {
    return { level: 3 };
  }

  if (/^\d+\.\d+\s+/.test(trimmed)) {
    return { level: 2 };
  }

  if (/^\d+[、.．]\s*/.test(trimmed)) {
    return { level: 2 };
  }

  if (/^(摘要|Abstract|关键词|Key words|引言|绪论|结论|参考文献|致谢|附录)$/.test(trimmed)) {
    return { level: 1 };
  }

  return null;
}

function shouldPromoteHeading(
  line: string,
  context: HeadingDetectionContext,
): 1 | 2 | 3 | 4 | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  if (
    isMarkdownHeading(trimmed) ||
    isQuote(trimmed) ||
    isBulletList(trimmed) ||
    isOrderedList(trimmed) ||
    isTableRow(trimmed) ||
    looksLikeFullSentence(trimmed) ||
    trimmed.length > 48
  ) {
    return null;
  }

  const match = isStrongHeadingPattern(trimmed);
  if (!match) {
    const isTopTitle =
      context.lineIndex === 0 &&
      trimmed.length <= 24 &&
      !/[，。；：]/.test(trimmed) &&
      !looksLikeFullSentence(trimmed) &&
      (context.nextLine?.trim().length ?? 0) === 0;

    return isTopTitle ? 1 : null;
  }

  const previousLine = context.previousLine?.trim() ?? "";
  const nextLine = context.nextLine?.trim() ?? "";

  if (/^\d+[、.．]\s*/.test(trimmed) && /^\d+[、.．]\s*/.test(nextLine)) {
    return null;
  }

  const separated =
    previousLine.length === 0 ||
    nextLine.length === 0 ||
    looksLikeFullSentence(previousLine) ||
    isBlank(previousLine);

  return separated ? match.level : null;
}

function getStandaloneOrderedHeadingLevel(
  line: string,
  previousLine: string | null,
  nextLine: string | null,
): 4 | null {
  const trimmed = line.trim();
  const match = trimmed.match(/^(\d+)[.)]\s+(.+)$/);

  if (!match) {
    return null;
  }

  const title = match[2].trim();
  const previous = previousLine?.trim() ?? "";
  const next = nextLine?.trim() ?? "";

  if (
    !title ||
    title.length > 48 ||
    looksLikeFullSentence(title) ||
    previous.length > 0 ||
    next.length > 0
  ) {
    return null;
  }

  return 4;
}

function joinParagraphLines(lines: string[]): string {
  return lines.reduce((accumulator, line, index) => {
    if (index === 0) {
      return line.trim();
    }

    const previous = accumulator[accumulator.length - 1] ?? "";
    const current = line.trim();

    if (/[\u4e00-\u9fff，。！？；：、）》」』]$/.test(previous)) {
      return `${accumulator}${current}`;
    }

    if (/^[，。！？；：、）》」』]/.test(current)) {
      return `${accumulator}${current}`;
    }

    return `${accumulator} ${current}`;
  }, "");
}

function preprocessForMarkdown(input: string): string {
  const lines = input.split("\n");
  const output: string[] = [];
  let paragraphBuffer: string[] = [];
  let insideCodeFence = false;

  const flushParagraphBuffer = () => {
    if (paragraphBuffer.length > 0) {
      output.push(joinParagraphLines(paragraphBuffer));
      paragraphBuffer = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const previousLine = index > 0 ? lines[index - 1] : null;
    const nextLine = index < lines.length - 1 ? lines[index + 1] : null;

    if (isCodeFence(trimmed)) {
      flushParagraphBuffer();
      insideCodeFence = !insideCodeFence;
      output.push(line);
      return;
    }

    if (insideCodeFence) {
      output.push(line);
      return;
    }

    if (isBlank(trimmed)) {
      flushParagraphBuffer();
      output.push("");
      return;
    }

    const orderedHeadingLevel = getStandaloneOrderedHeadingLevel(trimmed, previousLine, nextLine);
    if (orderedHeadingLevel) {
      flushParagraphBuffer();
      output.push(`${"#".repeat(orderedHeadingLevel)} ${trimmed}`);
      return;
    }

    if (
      isTableSeparator(trimmed) ||
      isTableRow(trimmed) ||
      isQuote(trimmed) ||
      isBulletList(trimmed) ||
      isOrderedList(trimmed) ||
      isMarkdownHeading(trimmed)
    ) {
      flushParagraphBuffer();
      output.push(line);
      return;
    }

    const promotedHeadingLevel = shouldPromoteHeading(line, {
      lineIndex: index,
      previousLine,
      nextLine,
    });

    if (promotedHeadingLevel) {
      flushParagraphBuffer();
      output.push(`${"#".repeat(promotedHeadingLevel)} ${trimmed}`);
      return;
    }

    paragraphBuffer.push(line);
  });

  flushParagraphBuffer();
  return output.join("\n");
}

function shouldEndAcademicParagraph(line: string, nextLine: string | null): boolean {
  if (nextLine === null || isAcademicStructuralLine(nextLine)) {
    return true;
  }

  if (line.trim().length < 30 || !isAcademicSentenceEnd(line)) {
    return false;
  }

  return !startsWithContinuation(nextLine);
}

function preprocessAcademicForMarkdown(input: string): string {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const output: string[] = [];
  let paragraphBuffer: string[] = [];
  let insideCodeFence = false;
  let hasSeenAcademicContent = false;
  let hasAcademicTitle = false;

  const flushParagraphBuffer = () => {
    if (paragraphBuffer.length > 0) {
      output.push(joinParagraphLines(paragraphBuffer), "");
      paragraphBuffer = [];
    }
  };

  const pushSeparated = (text: string) => {
    output.push(text, "");
  };

  const markAcademicContent = () => {
    hasSeenAcademicContent = true;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const nextLine = index < lines.length - 1 ? lines[index + 1] : null;

    if (isCodeFence(trimmed)) {
      flushParagraphBuffer();
      insideCodeFence = !insideCodeFence;
      output.push(line);
      markAcademicContent();
      return;
    }

    if (insideCodeFence) {
      output.push(line);
      markAcademicContent();
      return;
    }

    if (isBlank(trimmed)) {
      flushParagraphBuffer();
      output.push("");
      return;
    }

    if (isTableSeparator(trimmed) || isTableRow(trimmed) || isQuote(trimmed) || isBulletList(trimmed)) {
      flushParagraphBuffer();
      output.push(line);
      markAcademicContent();
      return;
    }

    if (isMarkdownHeading(trimmed)) {
      flushParagraphBuffer();
      output.push(line);
      markAcademicContent();
      return;
    }

    if (isAcademicDocumentTitleCandidate(trimmed, nextLine, hasSeenAcademicContent, hasAcademicTitle)) {
      flushParagraphBuffer();
      pushSeparated(`# ${trimmed}`);
      hasAcademicTitle = true;
      markAcademicContent();
      return;
    }

    if (isAcademicKeywordLine(trimmed)) {
      flushParagraphBuffer();
      pushSeparated(trimmed);
      markAcademicContent();
      return;
    }

    const headingLevel = shouldPromoteAcademicHeading(trimmed, nextLine, index);
    if (headingLevel) {
      flushParagraphBuffer();
      output.push(`${"#".repeat(getAcademicMarkdownHeadingLevel(headingLevel))} ${trimmed}`);
      markAcademicContent();
      return;
    }

    paragraphBuffer.push(line);
    markAcademicContent();

    if (shouldEndAcademicParagraph(trimmed, nextLine)) {
      flushParagraphBuffer();
    }
  });

  flushParagraphBuffer();
  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function preprocessOfficialForMarkdown(input: string): {
  markdownText: string;
  classification: ClassifiedLine[];
} {
  const lines = input.split("\n");
  const output: string[] = [];
  const classification: ClassifiedLine[] = [];
  let paragraphBuffer: string[] = [];
  let insideCodeFence = false;

  const flushParagraphBuffer = () => {
    if (paragraphBuffer.length > 0) {
      const paragraphText = joinParagraphLines(paragraphBuffer);
      output.push(paragraphText);
      classification.push({ kind: "paragraph", text: paragraphText });
      paragraphBuffer = [];
    }
  };

  const pushSeparated = (text: string, kind: ClassifiedLine["kind"]) => {
    output.push(text, "");
    classification.push({
      kind,
      text: normalizeEscapedMarkers(text.replace(/^(#{1,4})\s+/, "")),
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const nextLine = index < lines.length - 1 ? lines[index + 1] : null;

    if (isCodeFence(trimmed)) {
      flushParagraphBuffer();
      insideCodeFence = !insideCodeFence;
      output.push(line);
      classification.push({ kind: "markdown", text: trimmed });
      return;
    }

    if (insideCodeFence) {
      output.push(line);
      classification.push({ kind: "markdown", text: line });
      return;
    }

    if (isBlank(trimmed)) {
      flushParagraphBuffer();
      output.push("");
      classification.push({ kind: "blank", text: "" });
      return;
    }

    if (isTableSeparator(trimmed) || isTableRow(trimmed) || isQuote(trimmed) || isBulletList(trimmed)) {
      flushParagraphBuffer();
      output.push(line);
      classification.push({ kind: "markdown", text: trimmed });
      return;
    }

    if (isMarkdownHeading(trimmed)) {
      flushParagraphBuffer();
      output.push(line);
      classification.push({ kind: "markdown", text: trimmed });
      return;
    }

    if (isOfficialTitleCandidate(trimmed, index, nextLine)) {
      flushParagraphBuffer();
      pushSeparated(`# ${trimmed}`, "title");
      return;
    }

    if (index <= 4 && isOfficialMeta(trimmed)) {
      flushParagraphBuffer();
      pushSeparated(trimmed, "meta");
      return;
    }

    if (isOfficialSalutation(trimmed)) {
      flushParagraphBuffer();
      pushSeparated(trimmed, "salutation");
      return;
    }

    if (isOfficialH1(trimmed)) {
      flushParagraphBuffer();
      pushSeparated(`## ${trimmed}`, "h1");
      return;
    }

    if (isOfficialH2(trimmed)) {
      flushParagraphBuffer();
      pushSeparated(`### ${trimmed}`, "h2");
      return;
    }

    if (isOfficialH3(trimmed)) {
      flushParagraphBuffer();
      pushSeparated(`#### ${trimmed}`, "h3");
      return;
    }

    if (isOfficialNumberedParagraph(trimmed)) {
      flushParagraphBuffer();
      pushSeparated(escapeOrderedListMarker(trimmed), "numbered-paragraph");
      return;
    }

    paragraphBuffer.push(line);
  });

  flushParagraphBuffer();

  return {
    markdownText: output.join("\n"),
    classification: classification.filter((item) => item.kind !== "blank"),
  };
}

export function classifyOfficialDocumentLines(input: string): ClassifiedLine[] {
  return preprocessOfficialForMarkdown(input).classification;
}

function renderInline(inlineToken: MarkdownToken | undefined): string {
  if (!inlineToken) {
    return "";
  }

  return markdown.renderInline(inlineToken.content);
}

function stripOuterTag(html: string, tagName: string): string {
  const expression = new RegExp(`^<${tagName}>([\\s\\S]*)<\\/${tagName}>$`);
  return html.replace(expression, "$1");
}

function getOfficialParagraphRole(text: string): ParagraphBlock["role"] {
  if (isOfficialNumberedParagraph(text)) {
    return "numbered-paragraph";
  }

  if (isOfficialSalutation(text)) {
    return "salutation";
  }

  if (isOfficialMeta(text)) {
    return "meta";
  }

  return undefined;
}

function getAcademicParagraphRole(text: string): ParagraphBlock["role"] {
  return isAcademicKeywordLine(text) ? "keyword" : undefined;
}

function normalizeEscapedMarkers(text: string): string {
  return text.replace(/^(\d+)\\([.)])(\s*)/, "$1$2$3");
}

function getOfficialHeadingRole(level: 1 | 2 | 3 | 4): HeadingBlock["role"] {
  if (level === 1) {
    return "title";
  }

  if (level === 2) {
    return "official-h1";
  }

  if (level === 3) {
    return "official-h2";
  }

  return "official-h3";
}

function getShiftedHeadingRole(level: 1 | 2 | 3 | 4): HeadingBlock["role"] {
  if (level <= 2) {
    return "heading1";
  }

  if (level === 3) {
    return "heading2";
  }

  return "heading3";
}

function getUnshiftedHeadingRole(level: 1 | 2 | 3 | 4): HeadingBlock["role"] {
  if (level === 1) {
    return "heading1";
  }

  if (level === 2) {
    return "heading2";
  }

  return "heading3";
}

function getHeadingRole(
  level: 1 | 2 | 3 | 4,
  officialProfile: boolean,
  academicProfile: boolean,
  hasDocumentTitle: boolean,
  isFirstDocumentBlock: boolean,
): HeadingBlock["role"] {
  if (officialProfile) {
    return getOfficialHeadingRole(level);
  }

  if (academicProfile) {
    return level === 1 && isFirstDocumentBlock && !hasDocumentTitle ? "title" : getShiftedHeadingRole(level);
  }

  if (level === 1 && isFirstDocumentBlock && !hasDocumentTitle) {
    return "title";
  }

  return hasDocumentTitle ? getShiftedHeadingRole(level) : getUnshiftedHeadingRole(level);
}

function createParagraphBlock(
  inlineToken: MarkdownToken,
  officialProfile: boolean,
  academicProfile: boolean,
): ParagraphBlock {
  const text = officialProfile ? normalizeEscapedMarkers(inlineToken.content) : inlineToken.content;

  return {
    type: "paragraph",
    text,
    html: renderInline(inlineToken),
    role: officialProfile ? getOfficialParagraphRole(text) : academicProfile ? getAcademicParagraphRole(text) : undefined,
  };
}

function parseList(tokens: MarkdownToken[], startIndex: number): { block: ListBlock; nextIndex: number } {
  const openToken = tokens[startIndex];
  const ordered = openToken.type === "ordered_list_open";
  const items: string[] = [];
  let index = startIndex + 1;

  while (
    index < tokens.length &&
    tokens[index].type !== (ordered ? "ordered_list_close" : "bullet_list_close")
  ) {
    if (tokens[index].type === "inline") {
      items.push(renderInline(tokens[index]));
    }
    index += 1;
  }

  return {
    block: {
      type: "list",
      ordered,
      items,
    },
    nextIndex: index,
  };
}

function parseTable(tokens: MarkdownToken[], startIndex: number): { block: TableBlock; nextIndex: number } {
  const headers: string[] = [];
  const rows: string[][] = [];
  let currentRow: string[] | null = null;
  let insideHead = false;
  let index = startIndex + 1;

  while (index < tokens.length && tokens[index].type !== "table_close") {
    const token = tokens[index];

    if (token.type === "thead_open") {
      insideHead = true;
    } else if (token.type === "thead_close") {
      insideHead = false;
    } else if (token.type === "tr_open") {
      currentRow = [];
    } else if (token.type === "inline" && currentRow) {
      currentRow.push(stripOuterTag(markdown.renderInline(token.content), "p"));
    } else if (token.type === "tr_close" && currentRow) {
      if (insideHead) {
        headers.push(...currentRow);
      } else {
        rows.push(currentRow);
      }
      currentRow = null;
    }

    index += 1;
  }

  return {
    block: {
      type: "table",
      headers,
      rows,
    },
    nextIndex: index,
  };
}

function createHeadingBlock(
  openToken: MarkdownToken,
  inlineToken: MarkdownToken,
  officialProfile: boolean,
  academicProfile: boolean,
  hasDocumentTitle: boolean,
  isFirstDocumentBlock: boolean,
): HeadingBlock {
  const level = Number.parseInt(openToken.tag.replace("h", ""), 10) as 1 | 2 | 3 | 4;
  const normalizedLevel = level <= 4 ? level : 4;
  return {
    type: "heading",
    level: normalizedLevel,
    text: inlineToken.content,
    html: renderInline(inlineToken),
    role: getHeadingRole(normalizedLevel, officialProfile, academicProfile, hasDocumentTitle, isFirstDocumentBlock),
  };
}

export function parseMarkdown(input: string, options: ParseMarkdownOptions = {}): DocumentModel {
  const officialProfile = options.profileId === "official-document";
  const academicProfile = isAcademicProfile(options.profileId);
  const officialPrepared = officialProfile ? preprocessOfficialForMarkdown(input) : null;
  const preparedMarkdown =
    officialPrepared?.markdownText ?? (academicProfile ? preprocessAcademicForMarkdown(input) : preprocessForMarkdown(input));
  const tokens = markdown.parse(preparedMarkdown, {}) as MarkdownToken[];
  const blocks: DocumentBlock[] = [];
  let hasDocumentTitle = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === "heading_open") {
      const inlineToken = tokens[index + 1];
      if (inlineToken?.type === "inline") {
        const headingBlock = createHeadingBlock(
          token,
          inlineToken,
          officialProfile,
          academicProfile,
          hasDocumentTitle,
          blocks.length === 0,
        );
        blocks.push(headingBlock);
        hasDocumentTitle = hasDocumentTitle || headingBlock.role === "title";
      }
      continue;
    }

    if (token.type === "paragraph_open") {
      const inlineToken = tokens[index + 1];
      if (inlineToken?.type === "inline") {
        blocks.push(createParagraphBlock(inlineToken, officialProfile, academicProfile));
      }
      continue;
    }

    if (token.type === "bullet_list_open" || token.type === "ordered_list_open") {
      const { block, nextIndex } = parseList(tokens, index);
      blocks.push(block);
      index = nextIndex;
      continue;
    }

    if (token.type === "blockquote_open") {
      const inlineToken = tokens[index + 2];
      if (inlineToken?.type === "inline") {
        blocks.push({
          type: "blockquote",
          text: inlineToken.content,
          html: renderInline(inlineToken),
        });
      }
      continue;
    }

    if (token.type === "fence" || token.type === "code_block") {
      blocks.push({
        type: "code",
        text: token.content,
        language: token.info.trim() || undefined,
      });
      continue;
    }

    if (token.type === "table_open") {
      const { block, nextIndex } = parseTable(tokens, index);
      blocks.push(block);
      index = nextIndex;
    }
  }

  const documentModel = {
    blocks,
    cleanedMarkdown: preparedMarkdown,
    classification: officialPrepared?.classification,
  };

  if (officialProfile && isDevelopmentMode() && documentModel.classification?.length) {
    console.table(documentModel.classification);
  }

  return documentModel;
}
