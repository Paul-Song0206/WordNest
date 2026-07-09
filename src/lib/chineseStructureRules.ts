export type HeadingPatternMatch = {
  level: 1 | 2 | 3 | 4;
  ruleId: string;
  weight: number;
  reason: string;
};

export type ReferenceItemContext = {
  insideReferenceSection?: boolean;
};

const headingKeywords =
  /(\u80cc\u666f|\u610f\u4e49|\u65b9\u6cd5|\u95ee\u9898|\u5efa\u8bae|\u7ed3\u8bba|\u5206\u6790|\u8def\u5f84|\u673a\u5236|\u7814\u7a76|\u73b0\u72b6|\u5bf9\u7b56|\u63aa\u65bd|\u4f53\u7cfb|\u539f\u56e0|\u76ee\u6807)/;
const sentenceEnd = /[\u3002\uff1f\uff01\uff1b.!?;]$/;
const declarativeMarks = /[\uff0c\uff1b,;].*[\uff0c\uff1b,;]/;
const referenceHeading = /^(?:\u53c2\u8003\u6587\u732e|references?|bibliography)$/i;
const bracketedReferenceItem = /^\[\d+\]\s*\S.+/;
const numberedReferenceItem = /^\d+[.)]\s+\S.+/;
const authorYearReferenceItem = /^[A-Z][A-Za-z'.-]+(?:,\s*[A-Z](?:\.)?)+(?:\s*&\s*[A-Z][A-Za-z'.-]+(?:,\s*[A-Z](?:\.)?)+)?\s*\(\d{4}[a-z]?\)\.\s+\S.+/;

export function hasHeadingKeyword(text: string): boolean {
  return headingKeywords.test(text);
}

export function endsWithSentencePunctuation(text: string): boolean {
  return sentenceEnd.test(text);
}

export function hasManyDeclarativeMarks(text: string): boolean {
  return declarativeMarks.test(text);
}

export function isAcademicAbstractInline(text: string): boolean {
  return /^(?:(?:\u4e2d\u6587|\u82f1\u6587)?\u6458\s*\u8981|abstract)\s*[:\uff1a]\s*.+$/i.test(
    text.trim(),
  );
}

export function isAbstractHeading(text: string): boolean {
  return /^(?:(?:\u4e2d\u6587|\u82f1\u6587)?\u6458\s*\u8981|abstract)\s*[:\uff1a]?$/i.test(
    text.trim(),
  );
}

export function isAcademicKeywordLine(text: string): boolean {
  return /^(?:\u5173\s*\u952e\s*\u8bcd|keywords?|key\s+words?)\s*[:\uff1a]\s*.*$/i.test(
    text.trim(),
  );
}

export function getCaptionKind(text: string): "figure" | "table" | null {
  const trimmed = text.trim();

  if (/^图\s*\d+(?:[-－—]\d+)?(?:\s*[：:.．、]\s*|\s+)\S+/.test(trimmed)) {
    return "figure";
  }

  if (/^表\s*\d+(?:[-－—]\d+)?(?:\s*[：:.．、]\s*|\s+)\S+/.test(trimmed)) {
    return "table";
  }

  if (/^(?:figure|fig\.)\s+\d+(?:[-.]\d+)?(?:\s*[.:：]\s*|\s+)\S+/i.test(trimmed)) {
    return "figure";
  }

  if (/^table\s+\d+(?:[-.]\d+)?(?:\s*[.:：]\s*|\s+)\S+/i.test(trimmed)) {
    return "table";
  }

  return null;
}

export function isCaptionLine(text: string): boolean {
  return getCaptionKind(text) !== null;
}

export function isReferenceHeading(text: string): boolean {
  return referenceHeading.test(text.trim());
}

export function isReferenceItem(text: string, context: ReferenceItemContext = {}): boolean {
  const trimmed = text.trim();

  if (bracketedReferenceItem.test(trimmed)) {
    return true;
  }

  if (!context.insideReferenceSection) {
    return false;
  }

  return numberedReferenceItem.test(trimmed) || authorYearReferenceItem.test(trimmed);
}

export function matchHeadingPattern(line: string): HeadingPatternMatch | null {
  if (/^第[0-9\u4e00-\u9fa5]+(?:\u7ae0|\u90e8\u5206|\u8282)[\s\uff1a:、.]*/.test(line)) {
    return { level: 1, ruleId: "chinese-section-heading", weight: 0.68, reason: "matches 第X章/节 pattern" };
  }

  if (/^\d+\.\d+\.\d+\.\d+\s+/.test(line)) {
    return { level: 4, ruleId: "decimal-heading", weight: 0.7, reason: "matches decimal heading" };
  }

  if (/^\d+\.\d+\.\d+\s+/.test(line)) {
    return { level: 3, ruleId: "decimal-heading", weight: 0.7, reason: "matches decimal heading" };
  }

  if (/^\d+\.\d+\s+/.test(line)) {
    return { level: 2, ruleId: "decimal-heading", weight: 0.7, reason: "matches decimal heading" };
  }

  if (/^\d+\s+/.test(line)) {
    return { level: 1, ruleId: "decimal-heading", weight: 0.66, reason: "matches top-level numeric heading" };
  }

  if (/^[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u4e07]+[、.．]\s*/.test(line)) {
    return { level: 2, ruleId: "chinese-number-heading", weight: 0.66, reason: "matches Chinese numbered heading" };
  }

  if (/^[（(][\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u4e07]+[)）]\s*/.test(line)) {
    return { level: 3, ruleId: "chinese-parenthetical-heading", weight: 0.64, reason: "matches parenthetical heading" };
  }

  if (/^\d+[、.．]\s*/.test(line)) {
    return { level: 2, ruleId: "arabic-number-heading", weight: 0.54, reason: "matches Arabic numbered heading" };
  }

  if (isAbstractHeading(line)) {
    return { level: 1, ruleId: "paper-abstract-heading", weight: 0.72, reason: "matches abstract heading" };
  }

  if (/^(?:\u5173\u952e\u8bcd|Key words|\u5f15\u8a00|\u7eea\u8bba|\u7ed3\u8bba|\u53c2\u8003\u6587\u732e|\u81f4\u8c22|\u9644\u5f55)$/i.test(line)) {
    return { level: 1, ruleId: "academic-structural-heading", weight: 0.72, reason: "matches academic structural heading" };
  }

  return null;
}

export function looksSequentialNumberedList(current: string, next: string): boolean {
  const currentMatch = current.match(/^(\d+)[.)、．]\s+/);
  const nextMatch = next.match(/^(\d+)[.)、．]\s+/);
  return Boolean(
    currentMatch &&
      nextMatch &&
      Number.parseInt(nextMatch[1], 10) === Number.parseInt(currentMatch[1], 10) + 1,
  );
}
