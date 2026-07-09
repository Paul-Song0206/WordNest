import { useEffect, useMemo, useState } from "react";
import ActionToolbar from "./components/ActionToolbar";
import EditorPanel from "./components/EditorPanel";
import PreviewPanel from "./components/PreviewPanel";
import PrivacyNote from "./components/PrivacyNote";
import RuleDebugPanel from "./components/RuleDebugPanel";
import StyleSettingsPanel from "./components/StyleSettingsPanel";
import TemplateSelector from "./components/TemplateSelector";
import { cleanText } from "./lib/cleanText";
import { copyForWord, renderPreviewHtml, renderWordHtml } from "./lib/copyForWord";
import { downloadHtml, downloadMarkdown } from "./lib/exportFiles";
import { parseMarkdown } from "./lib/parseMarkdown";
import { mergeStyles } from "./lib/styleSettings";
import { builtInTemplates } from "./lib/templates";
import type { RoleStyleOverride, StyleRole, UserStyleOverrides, WordCopyMode } from "./types/document";

const templateStorageKey = "word-editor-template-id";
const overridesStorageKey = "word-editor-style-overrides";

function loadStoredTemplateId(): string {
  if (typeof window === "undefined") {
    return builtInTemplates[0].id;
  }

  const storedTemplateId = window.localStorage.getItem(templateStorageKey);
  return storedTemplateId && builtInTemplates.some((template) => template.id === storedTemplateId)
    ? storedTemplateId
    : builtInTemplates[0].id;
}

function loadStoredOverrides(): Record<string, UserStyleOverrides> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(overridesStorageKey) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [rawInput, setRawInput] = useState("");
  const [templateId, setTemplateId] = useState(loadStoredTemplateId);
  const [styleOverridesByTemplate, setStyleOverridesByTemplate] = useState(loadStoredOverrides);
  const [status, setStatus] = useState<string>("");
  const [isStyleSettingsOpen, setIsStyleSettingsOpen] = useState(false);
  const [copyMode, setCopyMode] = useState<WordCopyMode>("styled");

  const selectedTemplate = useMemo(
    () => builtInTemplates.find((template) => template.id === templateId) ?? builtInTemplates[0],
    [templateId],
  );

  const selectedOverrides = useMemo(
    () => styleOverridesByTemplate[selectedTemplate.id] ?? {},
    [styleOverridesByTemplate, selectedTemplate.id],
  );
  const effectiveTemplate = useMemo(
    () => ({
      ...selectedTemplate,
      styles: mergeStyles(selectedTemplate.styles, selectedOverrides),
    }),
    [selectedTemplate, selectedOverrides],
  );

  useEffect(() => {
    window.localStorage.setItem(templateStorageKey, templateId);
  }, [templateId]);

  useEffect(() => {
    window.localStorage.setItem(overridesStorageKey, JSON.stringify(styleOverridesByTemplate));
  }, [styleOverridesByTemplate]);

  useEffect(() => {
    if (!isStyleSettingsOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsStyleSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isStyleSettingsOpen]);

  const processed = useMemo(() => {
    const cleanedText = cleanText(rawInput);
    const documentModel = parseMarkdown(cleanedText, { profileId: selectedTemplate.id });
    if (isDevelopmentMode() && cleanedText.trim()) {
      console.groupCollapsed(`[Word Editor debug] template=${selectedTemplate.id}`);
      console.table(
        documentModel.blocks.map((block) => {
          const text =
            "text" in block
              ? block.text
              : block.type === "list"
                ? block.items.join(" ")
                : block.type === "table"
                  ? block.headers.join(" ")
                  : "";

          return {
            type: block.type,
            level: block.type === "heading" ? block.level : "",
            role: "role" in block ? (block.role ?? "") : "",
            text: text.slice(0, 30),
          };
        }),
      );
      console.groupEnd();
    }
    const previewHtml = renderPreviewHtml(documentModel, effectiveTemplate);
    const wordHtml = renderWordHtml(documentModel, effectiveTemplate, copyMode);

    return {
      cleanedText,
      documentModel,
      previewHtml,
      wordHtml,
    };
  }, [rawInput, selectedTemplate.id, effectiveTemplate, copyMode]);

  const hasInput = rawInput.trim().length > 0;
  const characterCount = Array.from(rawInput.replace(/\s/g, "")).length;

  const handleStyleOverridesChange = (overrides: UserStyleOverrides) => {
    setStyleOverridesByTemplate((current) => ({
      ...current,
      [selectedTemplate.id]: stripEmptyOverrides(overrides),
    }));
  };

  const handleResetStyleOverrides = () => {
    setStyleOverridesByTemplate((current) => {
      const next = { ...current };
      delete next[selectedTemplate.id];
      return next;
    });
    setStatus(`已恢复“${selectedTemplate.name}”模板默认样式。`);
  };

  const handleCopy = async () => {
    const result = await copyForWord(processed.wordHtml, processed.cleanedText);
    setStatus(result.message);
  };

  const handleDownloadMarkdown = () => {
    downloadMarkdown("cleaned-text.md", processed.documentModel);
    setStatus("已导出清理后的 Markdown。");
  };

  const handleDownloadHtml = () => {
    downloadHtml("word-friendly.html", processed.wordHtml);
    setStatus("已导出适合 Word 粘贴的 HTML。");
  };

  const handleLoadSample = () => {
    setRawInput(selectedTemplate.sampleInput ?? "");
    setStatus(`已载入“${selectedTemplate.name}”示例文本。`);
  };

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[92rem] flex-col gap-3.5 px-3.5 py-4 md:px-6 md:py-5">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-lg font-semibold text-white shadow-sm shadow-indigo-200">
              W
            </div>
            <div className="min-w-0">
              <h1 className="text-[1.35rem] font-semibold leading-tight tracking-tight text-slate-950">
                Word 排版助手
              </h1>
              <p className="mt-1 text-sm leading-5 text-slate-500">粘贴文本，整理格式，一键复制到 Word。</p>
            </div>
          </div>
          <PrivacyNote />
        </header>

        <section className="rounded-lg border border-slate-200/80 bg-white/95 px-3.5 py-3 shadow-sm shadow-slate-200/50 md:px-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(15rem,21rem)_minmax(0,1fr)] xl:items-center">
            <TemplateSelector
              templates={builtInTemplates}
              selectedTemplateId={templateId}
              onSelectTemplate={setTemplateId}
            />
            <ActionToolbar
              canUseOutput={hasInput}
              copyMode={copyMode}
              onCopyModeChange={setCopyMode}
              onCopyForWord={handleCopy}
              onDownloadMarkdown={handleDownloadMarkdown}
              onDownloadHtml={handleDownloadHtml}
              onLoadSample={handleLoadSample}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200/70">
                当前模板：<span className="font-medium text-slate-700">{selectedTemplate.name}</span>
              </span>
              <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-indigo-700 ring-1 ring-indigo-100">
                仅整理格式，不改写内容
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsStyleSettingsOpen(true)}
              className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-50"
            >
              高级样式设置
            </button>
          </div>
        </section>

        {isStyleSettingsOpen ? (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="关闭高级样式设置"
              className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px]"
              onClick={() => setIsStyleSettingsOpen(false)}
            />
            <aside
              aria-label="高级样式设置"
              role="dialog"
              aria-modal="true"
              className="absolute inset-y-0 left-0 flex w-full flex-col border-r border-slate-200 bg-white shadow-2xl sm:max-w-[38rem] xl:max-w-[44rem]"
            >
              <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 sm:px-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">高级样式设置</h2>
                  <p className="mt-0.5 text-xs text-slate-500">调整当前模板的 Word 粘贴样式。</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStyleSettingsOpen(false)}
                  className="h-8 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-white hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-50"
                >
                  关闭
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-3 sm:p-5">
                <StyleSettingsPanel
                  overrides={selectedOverrides}
                  onChange={handleStyleOverridesChange}
                  onReset={handleResetStyleOverrides}
                />
              </div>
            </aside>
          </div>
        ) : null}

        <section className="grid flex-1 gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <EditorPanel value={rawInput} characterCount={characterCount} onChange={setRawInput} />
          <PreviewPanel
            html={processed.previewHtml}
            template={selectedTemplate}
            status={status}
            hasContent={processed.documentModel.blocks.length > 0}
          />
        </section>

        <RuleDebugPanel
          rows={processed.documentModel.debugRows}
          blocks={processed.documentModel.stableBlocks}
          hasContent={processed.documentModel.blocks.length > 0}
        />
      </div>
    </main>
  );
}

function stripEmptyOverrides(overrides: UserStyleOverrides): UserStyleOverrides {
  const next: UserStyleOverrides = {};

  if (overrides.chineseFont) {
    next.chineseFont = overrides.chineseFont;
  }

  if (overrides.latinFont) {
    next.latinFont = overrides.latinFont;
  }

  if (overrides.bodyFontSize) {
    next.bodyFontSize = overrides.bodyFontSize;
  }

  if (overrides.lineHeight) {
    next.lineHeight = overrides.lineHeight;
  }

  if (overrides.firstLineIndent) {
    next.firstLineIndent = overrides.firstLineIndent;
  }

  if (overrides.numericListHandling) {
    next.numericListHandling = overrides.numericListHandling;
  }

  const roleOverrides = stripEmptyRoleOverrides(overrides.roleOverrides);
  if (roleOverrides) {
    next.roleOverrides = roleOverrides;
  }

  return next;
}

function isDevelopmentMode(): boolean {
  return Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);
}

function stripEmptyRoleOverrides(
  roleOverrides: UserStyleOverrides["roleOverrides"],
): Partial<Record<StyleRole, RoleStyleOverride>> | undefined {
  if (!roleOverrides) {
    return undefined;
  }

  const next: Partial<Record<StyleRole, RoleStyleOverride>> = {};

  (Object.entries(roleOverrides) as Array<[StyleRole, RoleStyleOverride | undefined]>).forEach(
    ([role, override]) => {
      if (!override || override.mode !== "custom") {
        return;
      }

      const cleaned: RoleStyleOverride = { mode: "custom" };

      if (override.chineseFont) {
        cleaned.chineseFont = override.chineseFont;
      }

      if (override.latinFont) {
        cleaned.latinFont = override.latinFont;
      }

      if (override.fontSize) {
        cleaned.fontSize = override.fontSize;
      }

      if (override.bold !== undefined) {
        cleaned.bold = override.bold;
      }

      if (override.textAlign) {
        cleaned.textAlign = override.textAlign;
      }

      next[role] = cleaned;
    },
  );

  return Object.keys(next).length > 0 ? next : undefined;
}
