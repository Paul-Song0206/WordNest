import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cleanText } from "../lib/cleanText";
import { parseMarkdown } from "../lib/parseMarkdown";
import { parseToBlocks } from "../lib/parseToBlocks";
import type { DocumentBlockRole, StableBlock } from "../types/document";

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

function parseFixture(name: string, profileId = "general-clean") {
  return parseMarkdown(cleanText(fixture(name)), { profileId });
}

function parseText(input: string, profileId = "thesis"): StableBlock[] {
  return parseToBlocks(cleanText(input), { profileId }).stableBlocks;
}

function blockText(block: StableBlock): string {
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

function allText(blocks: StableBlock[]): string {
  return blocks.map(blockText).join("\n");
}

function headingTexts(blocks: StableBlock[]): string[] {
  return blocks
    .filter((block): block is Extract<StableBlock, { type: "title" | "heading" }> =>
      block.type === "title" || block.type === "heading",
    )
    .map((block) => block.text);
}

function headings(blocks: StableBlock[]): Array<Extract<StableBlock, { type: "heading" }>> {
  return blocks.filter((block): block is Extract<StableBlock, { type: "heading" }> => block.type === "heading");
}

function blocksWithRole(blocks: StableBlock[], role: DocumentBlockRole): StableBlock[] {
  return blocks.filter((block) => "role" in block && block.role === role);
}

describe("Chinese parser regression fixtures", () => {
  it("exposes parseToBlocks as the stable parser-core entry", () => {
    const result = parseToBlocks(cleanText(fixture("ai-basic.md")), { profileId: "general-clean" });

    expect(parseToBlocks).toEqual(expect.any(Function));
    expect(result.blocks.length).toBeGreaterThan(0);
    expect(result.stableBlocks.length).toBeGreaterThan(0);
    expect(result.debugRows.length).toBeGreaterThan(0);
    expect(allText(result.stableBlocks)).toContain("普通说明文本");
    expect(result.metadata).toEqual({
      profileId: "general-clean",
      parserVersion: "1.2",
    });
  });

  it("keeps parseToBlocks compatible with parseMarkdown output", () => {
    const input = cleanText(fixture("course-paper.md"));
    const options = { profileId: "thesis" };
    const existingModel = parseMarkdown(input, options);
    const parserCoreModel = parseToBlocks(input, options);

    expect(parserCoreModel.blocks).toEqual(existingModel.blocks);
    expect(parserCoreModel.stableBlocks).toEqual(existingModel.stableBlocks);
    expect(parserCoreModel.cleanedMarkdown).toBe(existingModel.cleanedMarkdown);
    expect(parserCoreModel.debugRows).toEqual(existingModel.debugRows);
    expect("metadata" in existingModel).toBe(false);
  });

  it("recognizes standalone abstract title and abstract body roles", () => {
    const stableBlocks = parseText("摘要\n本文研究人工智能对学习自主性的影响。");

    expect(blocksWithRole(stableBlocks, "abstractTitle")).toEqual(
      expect.arrayContaining([expect.objectContaining({ text: "摘要" })]),
    );
    expect(blocksWithRole(stableBlocks, "abstractBody")).toEqual(
      expect.arrayContaining([expect.objectContaining({ text: "本文研究人工智能对学习自主性的影响。" })]),
    );
  });

  it("recognizes inline abstract and keyword roles without rewriting text", () => {
    const stableBlocks = parseText(
      "摘要：本文研究人工智能对学习自主性的影响。\n\n关键词：人工智能；学习自主性；认知外包",
    );

    expect(blocksWithRole(stableBlocks, "abstractBody")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "摘要：本文研究人工智能对学习自主性的影响。" }),
      ]),
    );
    expect(blocksWithRole(stableBlocks, "keywords")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "关键词：人工智能；学习自主性；认知外包" }),
      ]),
    );
  });

  it("recognizes figure and table captions conservatively", () => {
    const stableBlocks = parseText(
      [
        "图1 研究框架",
        "表 1：变量定义",
        "Figure 1. Research framework",
        "Table 1. Descriptive statistics",
      ].join("\n"),
      "general-clean",
    );
    const captions = blocksWithRole(stableBlocks, "caption");

    expect(captions).toHaveLength(4);
    expect(captions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "图1 研究框架", metadata: { captionKind: "figure" } }),
        expect.objectContaining({ text: "表 1：变量定义", metadata: { captionKind: "table" } }),
        expect.objectContaining({ text: "Figure 1. Research framework", metadata: { captionKind: "figure" } }),
        expect.objectContaining({ text: "Table 1. Descriptive statistics", metadata: { captionKind: "table" } }),
      ]),
    );
  });

  it("recognizes reference headings and grouped reference items", () => {
    const stableBlocks = parseText(
      "参考文献\n[1] 张三. 人工智能与教育研究.\n[2] 李四. 学习自主性研究.",
    );
    const headings = headingTexts(stableBlocks);

    expect(blocksWithRole(stableBlocks, "referenceHeading")).toEqual(
      expect.arrayContaining([expect.objectContaining({ text: "参考文献" })]),
    );
    expect(blocksWithRole(stableBlocks, "referenceItem")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "references",
          items: expect.arrayContaining([
            "[1] 张三. 人工智能与教育研究.",
            "[2] 李四. 学习自主性研究.",
          ]),
        }),
      ]),
    );
    expect(headings.some((text) => /^\[\d+\]/.test(text))).toBe(false);
  });

  it("does not misclassify normal academic headings as reference items", () => {
    const stableBlocks = parseText(
      "1.1 研究背景\n人工智能正在改变学习方式。\n\n一、研究背景\n这是正文。\n\n（一）研究意义\n这是正文。",
    );

    expect(stableBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "heading", text: "1.1 研究背景" }),
        expect.objectContaining({ type: "heading", text: "一、研究背景" }),
        expect.objectContaining({ type: "heading", text: "（一）研究意义" }),
      ]),
    );
    expect(blocksWithRole(stableBlocks, "referenceItem")).toHaveLength(0);
  });

  it("keeps ordinary AI answers mostly as paragraphs", () => {
    const { stableBlocks } = parseFixture("ai-basic.md");

    expect(stableBlocks.filter((block) => block.type === "paragraph").length).toBeGreaterThanOrEqual(1);
    expect(allText(stableBlocks)).toContain("普通说明文本");
    expect(allText(stableBlocks)).toContain("这一点很重要但它只是上一句话之后的补充说明");
    expect(headings(stableBlocks)).toHaveLength(0);
  });

  it("handles dirty Markdown while preserving structure", () => {
    const { stableBlocks } = parseFixture("ai-messy.md");

    expect(stableBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "title", text: "项目复盘材料" }),
        expect.objectContaining({ type: "heading", level: 2, text: "一、研究背景" }),
        expect.objectContaining({ type: "heading", level: 3, text: "（一）主要问题" }),
        expect.objectContaining({ type: "blockquote", text: expect.stringContaining("夹杂引用") }),
        expect.objectContaining({
          type: "list",
          items: expect.arrayContaining([expect.stringContaining("保留原文含义")]),
        }),
        expect.objectContaining({
          type: "list",
          ordered: true,
          items: expect.arrayContaining([expect.stringContaining("标题层级不清")]),
        }),
      ]),
    );
  });

  it("recognizes common course-paper structure", () => {
    const { stableBlocks } = parseFixture("course-paper.md", "thesis");

    expect(stableBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "title", text: "生成式人工智能辅助课程学习研究" }),
        expect.objectContaining({ type: "abstract", role: "abstractBody", text: expect.stringContaining("课程学习") }),
        expect.objectContaining({ type: "keywords", role: "keywords", text: expect.stringContaining("学术规范") }),
        expect.objectContaining({ type: "heading", level: 3, text: "一、研究背景" }),
        expect.objectContaining({ type: "heading", level: 4, text: "（一）研究意义" }),
      ]),
    );
  });

  it("preserves RUC-style academic paper sections and references", () => {
    const { stableBlocks } = parseFixture("ruc-paper.md", "ruc-undergraduate-thesis-2022");

    expect(stableBlocks).toEqual(
      expect.arrayContaining([expect.objectContaining({ role: "abstractTitle", text: "中文摘要" })]),
    );
    expect(stableBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "title", text: "中国人民大学本科论文格式测试" }),
        expect.objectContaining({ type: "keywords", text: expect.stringContaining("本科论文") }),
        expect.objectContaining({ type: "heading", level: 2, text: "1 引言" }),
        expect.objectContaining({ type: "heading", level: 3, text: "1.1 研究背景" }),
        expect.objectContaining({
          type: "references",
          items: expect.arrayContaining([expect.stringContaining("张三"), expect.stringContaining("李四")]),
        }),
      ]),
    );
  });

  it("parses government notices without turning signature dates into headings", () => {
    const { stableBlocks } = parseFixture("gov-notice.md", "official-document");
    const headings = headingTexts(stableBlocks);

    expect(stableBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "title", text: "关于开展课程材料报送工作的通知" }),
        expect.objectContaining({ type: "heading", level: 2, text: "一、报送范围" }),
        expect.objectContaining({ type: "heading", level: 3, text: "（一）材料要求" }),
        expect.objectContaining({ type: "heading", level: 2, text: "二、报送时间" }),
        expect.objectContaining({ type: "signature", lines: ["2026年7月9日"] }),
      ]),
    );
    expect(allText(stableBlocks)).toContain("各学院、各部门：");
    expect(allText(stableBlocks)).toContain("教务处");
    expect(headings).not.toContain("2026年7月9日");
    expect(headings).not.toContain("教务处");
  });

  it("recognizes formal government report sections and keeps body paragraphs", () => {
    const { stableBlocks } = parseFixture("gov-report.md", "official-document");

    expect(stableBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "title", text: "年度工作情况汇报" }),
        expect.objectContaining({ type: "signature", lines: ["汇报人：王五"] }),
        expect.objectContaining({ type: "heading", level: 2, text: "一、总体情况" }),
        expect.objectContaining({ type: "heading", level: 3, text: "（一）工作进展" }),
        expect.objectContaining({ type: "heading", level: 2, text: "二、存在问题" }),
        expect.objectContaining({ type: "paragraph", text: expect.stringContaining("各项工作有序推进") }),
      ]),
    );
  });

  it("groups bracketed references and avoids treating reference items as headings", () => {
    const { stableBlocks } = parseFixture("references.md", "thesis");
    const headings = headingTexts(stableBlocks);

    expect(stableBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "references",
          items: expect.arrayContaining([expect.stringContaining("[1] 张三"), expect.stringContaining("[2] Smith")]),
        }),
      ]),
    );
    expect(allText(stableBlocks)).toContain("王五. 公文格式规范");
    expect(headings.some((text) => /^\[\d+\]/.test(text) || /^\d+\.\s+/.test(text))).toBe(false);
  });

  it("preserves figure and table captions without promoting them to headings", () => {
    const { stableBlocks } = parseFixture("captions.md");
    const text = allText(stableBlocks);
    const headings = headingTexts(stableBlocks);
    const captions = blocksWithRole(stableBlocks, "caption");

    expect(text).toContain("图1 研究流程图");
    expect(text).toContain("表1 样本分布");
    expect(text).toContain("Figure 1 Workflow of the study");
    expect(captions.length).toBeGreaterThanOrEqual(3);
    expect(headings).not.toContain("图1 研究流程图");
    expect(headings).not.toContain("表1 样本分布");
    expect(headings).not.toContain("Figure 1 Workflow of the study");
  });

  it("converts Markdown tables into stable table blocks", () => {
    const { stableBlocks } = parseFixture("markdown-table.md");

    expect(stableBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "table",
          rows: expect.arrayContaining([
            expect.arrayContaining(["模块", "常见问题", "清理目标"]),
            expect.arrayContaining(["标题", "层级不清", "形成清晰结构"]),
          ]),
        }),
      ]),
    );
  });

  it("normalizes rich-text pasted plain text while preserving key content", () => {
    const raw = fixture("rich-text-paste.txt");
    const cleaned = cleanText(raw);
    const { stableBlocks } = parseMarkdown(cleaned, { profileId: "general-clean" });

    expect(cleaned).not.toContain("\n\n\n");
    expect(allText(stableBlocks)).toContain("保留原文含义");
    expect(allText(stableBlocks)).toContain("说明：仅整理格式，不改写内容。");
    expect(stableBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "list",
          ordered: true,
          items: expect.arrayContaining([expect.stringContaining("生成 Word 友好格式")]),
        }),
      ]),
    );
  });
});
