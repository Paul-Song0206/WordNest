import type {
  DocumentBlock,
  DocumentBlockRole,
  HeadingBlock,
  LineClassification,
  StableBlock,
} from "../types/document";
import {
  endsWithSentencePunctuation,
  getCaptionKind,
  hasHeadingKeyword,
  hasManyDeclarativeMarks,
  isAbstractHeading,
  isAcademicAbstractInline,
  isAcademicKeywordLine,
  isCaptionLine,
  isReferenceHeading,
  isReferenceItem,
  looksSequentialNumberedList,
  matchHeadingPattern,
} from "./chineseStructureRules";

export {
  isAbstractHeading,
  isAcademicAbstractInline,
  isCaptionLine,
  isReferenceHeading,
  isReferenceItem,
} from "./chineseStructureRules";

export type ProfileKind = "general" | "official" | "academic";

export type NormalizedLine = {
  lineNumber: number;
  rawText: string;
  normalizedText: string;
  previousLine: string | null;
  nextLine: string | null;
};

export type HeadingScoreContext = {
  lineIndex: number;
  previousLine: string | null;
  nextLine: string | null;
  profileKind: ProfileKind;
};

export type HeadingScoreResult = {
  score: number;
  level: 1 | 2 | 3 | 4 | null;
  ruleId: string;
  classification: string;
  output: string;
  reasons: string[];
};

export function getProfileKind(profileId: string | undefined): ProfileKind {
  if (profileId === "official-document") {
    return "official";
  }

  if (profileId === "thesis" || profileId === "ruc-undergraduate-thesis-2022") {
    return "academic";
  }

  return "general";
}

export function normalizeLines(input: string): NormalizedLine[] {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");

  return lines.map((line, index) => ({
    lineNumber: index + 1,
    rawText: line,
    normalizedText: line.trim(),
    previousLine: index > 0 ? lines[index - 1] : null,
    nextLine: index < lines.length - 1 ? lines[index + 1] : null,
  }));
}

export function createLineClassification(
  line: NormalizedLine,
  classification: string,
  ruleId: string,
  confidence: number,
  output: string,
  reasons: string[] = [],
  role?: DocumentBlockRole,
): LineClassification {
  return {
    lineNumber: line.lineNumber,
    rawText: line.rawText,
    normalizedText: line.normalizedText,
    classification,
    ruleId,
    confidence: roundConfidence(confidence),
    output,
    reasons,
    role,
  };
}

export function classifyLines(input: string, profileId: string | undefined): LineClassification[] {
  const profileKind = getProfileKind(profileId);
  let insideCodeFence = false;
  let insideReferenceSection = false;

  return normalizeLines(input)
    .map((line, index) => {
      if (line.normalizedText.length === 0) {
        return createLineClassification(line, "blank", "blank-line", 1, "", ["empty line"]);
      }

      if (/^(```|~~~)/.test(line.normalizedText)) {
        insideCodeFence = !insideCodeFence;
        return createLineClassification(line, "code fence", "markdown-code", 1, "pre", [
          "fenced code marker",
        ]);
      }

      if (insideCodeFence) {
        return createLineClassification(line, "code", "markdown-code", 1, "pre", ["inside fenced code"]);
      }

      const direct = classifyDirectLine(line, profileKind, insideReferenceSection);
      if (direct) {
        if (direct.role === "referenceHeading" || direct.role === "referenceItem") {
          insideReferenceSection = true;
        }
        return direct;
      }

      const score = scoreHeadingCandidate(line.normalizedText, {
        lineIndex: index,
        previousLine: line.previousLine,
        nextLine: line.nextLine,
        profileKind,
      });

      if (score.score >= headingThreshold(profileKind) && score.level) {
        return createLineClassification(
          line,
          score.classification,
          score.ruleId,
          score.score,
          score.output,
          score.reasons,
        );
      }

      if (score.score >= 0.5) {
        return createLineClassification(line, "possible heading", score.ruleId, score.score, "p", [
          ...score.reasons,
          "below heading threshold",
        ]);
      }

      return createLineClassification(line, "paragraph", "paragraph-default", 0.7, "p", [
        "no strong structural rule matched",
      ]);
    })
    .filter((row) => row.classification !== "blank");
}

export function scoreHeadingCandidate(line: string, context: HeadingScoreContext): HeadingScoreResult {
  const trimmed = line.trim();
  const reasons: string[] = [];
  let score = 0;
  let level: 1 | 2 | 3 | 4 | null = null;
  let ruleId = "heading-score";

  const pattern = matchHeadingPattern(trimmed);
  if (pattern) {
    score += pattern.weight;
    level = pattern.level;
    ruleId = pattern.ruleId;
    reasons.push(pattern.reason);
  }

  if (trimmed.length > 0 && trimmed.length <= 24) {
    score += 0.12;
    reasons.push("short line");
  } else if (trimmed.length <= 48) {
    score += 0.06;
    reasons.push("moderate length");
  } else {
    score -= 0.28;
    reasons.push("line is long");
  }

  if (!endsWithSentencePunctuation(trimmed)) {
    score += 0.1;
    reasons.push("does not end as sentence");
  } else {
    score -= 0.38;
    reasons.push("ends with sentence punctuation");
  }

  if (hasHeadingKeyword(trimmed)) {
    score += 0.1;
    reasons.push("contains heading keyword");
  }

  const previous = context.previousLine?.trim() ?? "";
  const next = context.nextLine?.trim() ?? "";

  if (previous.length === 0) {
    score += 0.08;
    reasons.push("previous line blank");
  }

  if (next.length > trimmed.length + 8) {
    score += 0.08;
    reasons.push("next line looks like body paragraph");
  }

  if (hasManyDeclarativeMarks(trimmed)) {
    score -= 0.16;
    reasons.push("many clause separators");
  }

  if (looksSequentialNumberedList(trimmed, next)) {
    score -= context.profileKind === "official" ? 0.12 : 0.3;
    reasons.push("looks like sequential list");
  }

  if (looksWrappedShortLine(trimmed, previous, next)) {
    score -= 0.22;
    reasons.push("surrounded by short wrapped lines");
  }

  if (context.profileKind === "official" && /^(?:[\u4e00-\u9fa5]+[、.．]|[（(][\u4e00-\u9fa5]+[)）])/.test(trimmed)) {
    score += 0.08;
    reasons.push("official profile numbering boost");
  }

  if (context.profileKind === "academic" && (isReferenceHeading(trimmed) || isAbstractHeading(trimmed))) {
    score += 0.1;
    reasons.push("academic structural heading");
  }

  if (context.profileKind === "general" && !pattern) {
    score -= 0.08;
    reasons.push("general profile conservative fallback");
  }

  const normalizedScore = clamp(score);
  const classification =
    normalizedScore >= headingThreshold(context.profileKind) && level
      ? `heading level ${level}`
      : normalizedScore >= 0.5
        ? "possible heading"
        : "paragraph";

  return {
    score: roundConfidence(normalizedScore),
    level,
    ruleId,
    classification,
    output: level ? `h${level}` : "p",
    reasons,
  };
}

export function headingThreshold(profileKind: ProfileKind): number {
  if (profileKind === "academic") {
    return 0.74;
  }

  if (profileKind === "official") {
    return 0.76;
  }

  return 0.82;
}

export function buildStableBlocks(
  blocks: DocumentBlock[],
  debugRows: LineClassification[] = [],
): StableBlock[] {
  const stableBlocks: StableBlock[] = [];
  const usedDebugIndexes = new Set<number>();
  let referenceItems: string[] = [];
  let insideReferenceSection = false;
  let pendingAbstractBody = false;

  const flushReferences = () => {
    if (referenceItems.length > 0) {
      stableBlocks.push({
        type: "references",
        items: referenceItems,
        ruleId: "references-section",
        role: "referenceItem",
      });
      referenceItems = [];
    }
  };

  blocks.forEach((block) => {
    if (
      block.type === "paragraph" &&
      (block.role === "referenceItem" || isReferenceItem(block.text, { insideReferenceSection }))
    ) {
      referenceItems.push(block.text);
      insideReferenceSection = true;
      pendingAbstractBody = false;
      return;
    }

    flushReferences();

    if (block.type === "heading") {
      const debug = takeDebugRow(block.text, debugRows, usedDebugIndexes);
      if (block.role === "referenceHeading") {
        stableBlocks.push({
          type: "heading",
          level: block.level,
          text: block.text,
          confidence: debug?.confidence ?? 0.96,
          ruleId: debug?.ruleId ?? "references-heading",
          role: "referenceHeading",
        });
        insideReferenceSection = true;
        pendingAbstractBody = false;
        return;
      }

      if (block.role === "abstractTitle") {
        stableBlocks.push({
          type: "heading",
          level: block.level,
          text: block.text,
          confidence: debug?.confidence ?? 0.96,
          ruleId: debug?.ruleId ?? "paper-abstract-heading",
          role: "abstractTitle",
        });
        insideReferenceSection = false;
        pendingAbstractBody = true;
        return;
      }

      if (block.role === "title") {
        stableBlocks.push({
          type: "title",
          text: block.text,
          confidence: debug?.confidence ?? 0.9,
          ruleId: debug?.ruleId ?? "document-title",
        });
        insideReferenceSection = false;
        pendingAbstractBody = false;
        return;
      }

      stableBlocks.push({
        type: "heading",
        level: block.level,
        text: block.text,
        confidence: debug?.confidence ?? 0.85,
        ruleId: debug?.ruleId ?? headingRuleId(block),
      });
      insideReferenceSection = false;
      pendingAbstractBody = false;
      return;
    }

    if (block.type === "paragraph") {
      const debug = takeDebugRow(block.text, debugRows, usedDebugIndexes);
      if (block.role === "meta") {
        stableBlocks.push({
          type: "signature",
          lines: [block.text],
          confidence: debug?.confidence ?? 0.82,
          ruleId: debug?.ruleId ?? "gov-signature-date",
        });
        pendingAbstractBody = false;
        return;
      }

      if (block.role === "abstractTitle") {
        stableBlocks.push({
          type: "paragraph",
          text: block.text,
          ruleId: debug?.ruleId ?? "paper-abstract-heading",
          role: "abstractTitle",
        });
        insideReferenceSection = false;
        pendingAbstractBody = true;
        return;
      }

      if (block.role === "keyword" || block.role === "keywords") {
        stableBlocks.push({
          type: "keywords",
          text: block.text,
          confidence: debug?.confidence ?? 0.98,
          ruleId: debug?.ruleId ?? "paper-keywords-inline",
          role: "keywords",
        });
        pendingAbstractBody = false;
        return;
      }

      if (block.role === "abstract" || block.role === "abstractBody" || pendingAbstractBody) {
        stableBlocks.push({
          type: "abstract",
          text: block.text,
          confidence: debug?.confidence ?? 0.92,
          ruleId: debug?.ruleId ?? (pendingAbstractBody ? "paper-abstract-body" : "paper-abstract-inline"),
          role: "abstractBody",
        });
        pendingAbstractBody = false;
        return;
      }

      if (block.role === "caption") {
        stableBlocks.push({
          type: "paragraph",
          text: block.text,
          ruleId: debug?.ruleId ?? "caption-line",
          role: "caption",
          metadata: {
            captionKind: getCaptionKind(block.text) ?? undefined,
          },
        });
        pendingAbstractBody = false;
        return;
      }

      stableBlocks.push({
        type: "paragraph",
        text: block.text,
        ruleId: debug?.ruleId ?? "paragraph-default",
      });
      pendingAbstractBody = false;
      return;
    }

    if (block.type === "list") {
      stableBlocks.push({
        type: "list",
        ordered: block.ordered,
        items: block.items.map(stripTags),
        level: 1,
        ruleId: block.ordered ? "markdown-ordered-list" : "markdown-bullet-list",
      });
      pendingAbstractBody = false;
      return;
    }

    if (block.type === "table") {
      stableBlocks.push({
        type: "table",
        rows: [block.headers, ...block.rows].filter((row) => row.length > 0).map((row) => row.map(stripTags)),
        ruleId: "markdown-table",
      });
      pendingAbstractBody = false;
      return;
    }

    if (block.type === "blockquote") {
      stableBlocks.push({
        type: "blockquote",
        text: block.text,
        ruleId: "markdown-blockquote",
      });
      pendingAbstractBody = false;
      return;
    }

    stableBlocks.push({
      type: "code",
      text: block.text,
      ruleId: "markdown-code",
    });
    pendingAbstractBody = false;
  });

  flushReferences();

  return stableBlocks;
}

export function debugRowsFromStableBlocks(blocks: StableBlock[]): LineClassification[] {
  return blocks.map((block, index) => {
    const text = stableBlockText(block);
    return {
      lineNumber: index + 1,
      rawText: text,
      normalizedText: text,
      classification: stableBlockClassification(block),
      ruleId: "ruleId" in block && block.ruleId ? block.ruleId : "block-derived",
      confidence: "confidence" in block ? block.confidence : 0.7,
      output: stableBlockOutput(block),
      reasons: ["derived from stable block"],
    };
  });
}

function classifyDirectLine(
  line: NormalizedLine,
  profileKind: ProfileKind,
  insideReferenceSection: boolean,
): LineClassification | null {
  const text = line.normalizedText;

  if (/^\s*\|?[\s:-]+(\|[\s:-]+)+\|?\s*$/.test(text) || /^\s*\|.+\|\s*$/.test(text)) {
    return createLineClassification(line, "table", "markdown-table", 1, "table", ["Markdown table row"]);
  }

  if (/^\s*>/.test(text)) {
    return createLineClassification(line, "blockquote", "markdown-blockquote", 1, "blockquote", [
      "Markdown blockquote marker",
    ]);
  }

  if (/^\s*[-*+]\s+/.test(text)) {
    return createLineClassification(line, "unordered list", "markdown-bullet-list", 1, "ul", [
      "Markdown bullet marker",
    ]);
  }

  if (/^\s*\d+[.)]\s+/.test(text) && looksSequentialNumberedList(text, line.nextLine?.trim() ?? "")) {
    return createLineClassification(line, "ordered list", "markdown-ordered-list", 0.95, "ol", [
      "sequential Markdown ordered-list marker",
    ]);
  }

  const markdownHeading = text.match(/^(#{1,6})\s+(.+)$/);
  if (markdownHeading) {
    const level = Math.min(markdownHeading[1].length, 4);
    return createLineClassification(
      line,
      `heading level ${level}`,
      "markdown-heading",
      1,
      `h${level}`,
      ["explicit Markdown heading"],
    );
  }

  if (isAcademicAbstractInline(text)) {
    return createLineClassification(line, "abstract", "paper-abstract-inline", 0.98, "p.abstract", [
      "inline abstract marker",
    ], "abstractBody");
  }

  if (isAbstractHeading(text)) {
    return createLineClassification(line, "abstract heading", "paper-abstract-heading", 0.96, "h1", [
      "standalone abstract heading",
    ], "abstractTitle");
  }

  if (isAcademicKeywordLine(text)) {
    return createLineClassification(line, "keywords", "paper-keywords-inline", 0.98, "p.keywords", [
      "inline keywords marker",
    ], "keywords");
  }

  if (isCaptionLine(text)) {
    return createLineClassification(line, "caption", "caption-line", 0.9, "p.caption", [
      "figure or table caption marker",
    ], "caption");
  }

  if (isReferenceHeading(text)) {
    return createLineClassification(line, "references heading", "references-heading", 0.96, "h1", [
      "references section heading",
    ], "referenceHeading");
  }

  if (isReferenceItem(text, { insideReferenceSection })) {
    return createLineClassification(line, "reference item", "references-item", 0.9, "p.reference", [
      "reference item marker",
    ], "referenceItem");
  }

  if (
    profileKind === "official" &&
    (/^（?\d{4}年\d{1,2}月\d{1,2}日）?$/.test(text) ||
      /^(?:\u6c47\u62a5\u4eba|\u53d1\u8a00\u4eba|\u62a5\u544a\u4eba|\u4f5c\u8005|\u5355\u4f4d|\u65f6\u95f4)[\uff1a:]\S+/.test(text))
  ) {
    return createLineClassification(line, "signature/date", "gov-signature-date", 0.9, "p.signature", [
      "government document metadata or date",
    ]);
  }

  return null;
}

function looksWrappedShortLine(current: string, previous: string, next: string): boolean {
  return (
    current.length < 18 &&
    previous.length > 0 &&
    previous.length < 24 &&
    next.length > 0 &&
    next.length < 24 &&
    !matchHeadingPattern(current)
  );
}

function takeDebugRow(
  text: string,
  debugRows: LineClassification[],
  usedIndexes: Set<number>,
): LineClassification | undefined {
  const normalizedText = normalizeTextForMatch(text);
  const index = debugRows.findIndex(
    (row, candidateIndex) =>
      !usedIndexes.has(candidateIndex) && normalizeTextForMatch(row.normalizedText) === normalizedText,
  );

  if (index === -1) {
    return undefined;
  }

  usedIndexes.add(index);
  return debugRows[index];
}

function headingRuleId(block: HeadingBlock): string {
  if (block.role?.startsWith("official")) {
    return "chinese-number-heading";
  }

  return isReferenceHeading(block.text) ? "references-heading" : "markdown-heading";
}

function stableBlockText(block: StableBlock): string {
  if ("text" in block) {
    return block.text;
  }

  if (block.type === "signature") {
    return block.lines.join(" ");
  }

  if (block.type === "references") {
    return block.items.join(" ");
  }

  if (block.type === "list") {
    return block.items.join(" ");
  }

  return block.rows.map((row) => row.join(" ")).join(" ");
}

function stableBlockClassification(block: StableBlock): string {
  if (block.type === "heading") {
    return `heading level ${block.level}`;
  }

  return block.type;
}

function stableBlockOutput(block: StableBlock): string {
  switch (block.type) {
    case "title":
      return "h1";
    case "heading":
      return `h${block.level}`;
    case "paragraph":
      return "p";
    case "signature":
      return "p.signature";
    case "keywords":
      return "p.keywords";
    case "abstract":
      return "p.abstract";
    case "references":
      return "section.references";
    case "list":
      return block.ordered ? "ol" : "ul";
    case "table":
      return "table";
    case "blockquote":
      return "blockquote";
    case "code":
      return "pre";
  }
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function normalizeTextForMatch(value: string): string {
  return stripTags(value).replace(/\s+/g, "").trim();
}

function roundConfidence(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
