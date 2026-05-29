export function cleanText(rawInput: string): string {
  if (!rawInput) {
    return "";
  }

  const normalizedRichPaste = normalizeRichPaste(rawInput);

  // Remove BOM and invisible spacing characters that commonly appear in pasted AI output.
  const withoutInvisibleNoise = normalizedRichPaste
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\u2060]/g, "")
    .replace(/\u00A0/g, " ");

  const normalizedNewlines = withoutInvisibleNoise.replace(/\r\n?/g, "\n");

  const trimmedLineEnds = normalizedNewlines
    .split("\n")
    .map((line) => line.replace(/[ \t\u3000]+$/g, "").replace(/^[\t\u3000]+/g, ""))
    .join("\n");

  const collapsedBlankLines = trimmedLineEnds.replace(/\n{3,}/g, "\n\n");

  return collapsedBlankLines.trim();
}

function normalizeRichPaste(input: string): string {
  if (!/<\/?(ol|ul|li|p|div|br)\b/i.test(input) || typeof DOMParser === "undefined") {
    return input;
  }

  const document = new DOMParser().parseFromString(input, "text/html");
  const text = walkHtmlNode(document.body, []);

  return text.trim() || input;
}

type ListContext = {
  ordered: boolean;
  index: number;
};

function walkHtmlNode(node: Node, listStack: ListContext[]): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();

  if (tagName === "br") {
    return "\n";
  }

  if (tagName === "ol" || tagName === "ul") {
    const context: ListContext = { ordered: tagName === "ol", index: 0 };
    return `${walkChildren(element, [...listStack, context])}\n`;
  }

  if (tagName === "li") {
    const context = listStack[listStack.length - 1];
    const marker = context ? getListMarker(context) : "";
    return `${marker}${walkChildren(element, listStack).trim()}\n`;
  }

  if (tagName === "p" || tagName === "div") {
    return `${walkChildren(element, listStack).trim()}\n`;
  }

  return walkChildren(element, listStack);
}

function walkChildren(element: Element, listStack: ListContext[]): string {
  return Array.from(element.childNodes)
    .map((child) => walkHtmlNode(child, listStack))
    .join("");
}

function getListMarker(context: ListContext): string {
  if (!context.ordered) {
    return "- ";
  }

  context.index += 1;
  return `${context.index}. `;
}
