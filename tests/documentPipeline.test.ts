import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderPreviewHtml, renderWordHtml } from "../src/lib/copyForWord";
import { parseMarkdown } from "../src/lib/parseMarkdown";
import { builtInTemplates } from "../src/lib/templates";
import type { DocumentModel } from "../src/types/document";

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

function template(id: string) {
  const match = builtInTemplates.find((item) => item.id === id);
  if (!match) {
    throw new Error(`Missing template ${id}`);
  }

  return match;
}

describe("stable document pipeline", () => {
  it("builds title, Chinese headings, paragraphs, and lists for basic AI output", () => {
    const model = parseMarkdown(fixture("ai-basic.md"), { profileId: "general-clean" });

    expect(model.stableBlocks).toMatchObject([
      { type: "title", text: "人工智能辅助学习研究报告" },
      { type: "heading", level: 2, text: "一、研究背景", ruleId: "chinese-number-heading" },
      { type: "paragraph" },
      { type: "heading", level: 3, text: "（一）主要问题" },
      { type: "paragraph" },
      { type: "list", ordered: false },
    ]);
  });

  it("keeps accidental short wrapped lines as paragraph text", () => {
    const model = parseMarkdown(fixture("ai-messy.md"), { profileId: "general-clean" });
    const headingTexts = model.stableBlocks
      .filter((block) => block.type === "heading" || block.type === "title")
      .map((block) => ("text" in block ? block.text : ""));

    expect(headingTexts).not.toContain("这一行很短");
    expect(model.stableBlocks).toContainEqual(
      expect.objectContaining({
        type: "paragraph",
        text: expect.stringContaining("这一行很短但其实是上一段被错误换行后的继续内容。"),
      }),
    );
  });

  it("recognizes academic abstract, keywords, and decimal headings", () => {
    const model = parseMarkdown(fixture("paper-basic.md"), { profileId: "thesis" });

    expect(model.stableBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "title", text: "人工智能辅助学习研究报告" }),
        expect.objectContaining({ type: "abstract", ruleId: "paper-abstract-inline" }),
        expect.objectContaining({ type: "keywords", ruleId: "paper-keywords-inline" }),
        expect.objectContaining({ type: "heading", text: "1 研究背景" }),
        expect.objectContaining({ type: "heading", text: "1.1 研究意义" }),
      ]),
    );
  });

  it("groups reference items into a stable references block", () => {
    const model = parseMarkdown(fixture("paper-ruc.md"), { profileId: "ruc-undergraduate-thesis-2022" });

    expect(model.stableBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "keywords" }),
        expect.objectContaining({
          type: "references",
          items: expect.arrayContaining([expect.stringContaining("张三"), expect.stringContaining("李四")]),
        }),
      ]),
    );
  });

  it("recognizes government title, numbered headings, and signature/date", () => {
    const model = parseMarkdown(fixture("gov-notice.md"), { profileId: "official-document" });

    expect(model.stableBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "title", text: "关于开展材料报送工作的通知" }),
        expect.objectContaining({ type: "heading", text: "一、报送范围" }),
        expect.objectContaining({ type: "heading", text: "（一）材料要求" }),
        expect.objectContaining({ type: "signature", lines: ["2026年7月9日"] }),
      ]),
    );
  });

  it("recognizes Markdown tables as stable table blocks", () => {
    const model = parseMarkdown(fixture("markdown-table.md"), { profileId: "general-clean" });

    expect(model.stableBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "table",
          rows: expect.arrayContaining([expect.arrayContaining(["模块", "常见问题", "清理目标"])]),
        }),
      ]),
    );
  });

  it("renders conservative and styled Word HTML through dedicated modes", () => {
    const model = parseMarkdown(fixture("paper-basic.md"), { profileId: "thesis" });
    const conservative = renderWordHtml(model, template("thesis"), "conservative");
    const styled = renderWordHtml(model, template("thesis"), "styled");

    expect(conservative).toContain("font-family:SimSun");
    expect(conservative).toContain("<h1");
    expect(styled).toContain("Times New Roman");
    expect(styled).toContain("text-indent:2em");
  });

  it("renders preview and Word HTML from stable blocks when available", () => {
    const model: DocumentModel = {
      blocks: [],
      stableBlocks: [
        { type: "title", text: "稳定块渲染测试", confidence: 0.99, ruleId: "test-title" },
        { type: "paragraph", text: "图1 研究框架", ruleId: "caption-line", role: "caption", metadata: { captionKind: "figure" } },
        { type: "keywords", text: "关键词：人工智能；学习自主性", confidence: 0.98, ruleId: "paper-keywords-inline", role: "keywords" },
      ],
      cleanedMarkdown: "",
      debugRows: [],
    };

    const preview = renderPreviewHtml(model, template("general-clean"));
    const word = renderWordHtml(model, template("general-clean"), "styled");

    expect(preview).toContain("稳定块渲染测试");
    expect(preview).toContain("official-caption");
    expect(word).toContain("关键词：人工智能；学习自主性");
  });
});
