import { useEffect, useMemo, useState } from "react";
import ActionToolbar from "./components/ActionToolbar";
import EditorPanel from "./components/EditorPanel";
import PreviewPanel from "./components/PreviewPanel";
import PrivacyNote from "./components/PrivacyNote";
import StyleSettingsPanel from "./components/StyleSettingsPanel";
import TemplateSelector from "./components/TemplateSelector";
import { cleanText } from "./lib/cleanText";
import { copyForWord, renderPreviewHtml, renderWordHtml } from "./lib/copyForWord";
import { downloadHtml, downloadMarkdown } from "./lib/exportFiles";
import { parseMarkdown } from "./lib/parseMarkdown";
import { mergeStyles } from "./lib/styleSettings";
import { builtInTemplates } from "./lib/templates";
import type { RoleStyleOverride, StyleRole, UserStyleOverrides } from "./types/document";

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
    const wordHtml = renderWordHtml(documentModel, effectiveTemplate);

    return {
      cleanedText,
      documentModel,
      previewHtml,
      wordHtml,
    };
  }, [rawInput, selectedTemplate.id, effectiveTemplate]);

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
      <div className="mx-auto flex min-h-screen max-w-[88rem] flex-col gap-3 px-3 py-3 md:px-5 md:py-4">
        <header className="flex flex-col gap-2 border-b border-slate-200 pb-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950">Word 排版助手</h1>
            <p className="mt-1 text-sm text-slate-600">粘贴文本，整理格式，一键复制到 Word。</p>
          </div>
          <PrivacyNote />
        </header>

        <section className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm md:px-4">
          <div className="grid gap-2.5 xl:grid-cols-[minmax(13rem,18rem)_minmax(0,1fr)] xl:items-center">
            <TemplateSelector
              templates={builtInTemplates}
              selectedTemplateId={templateId}
              onSelectTemplate={setTemplateId}
            />
            <ActionToolbar
              canUseOutput={hasInput}
              onCopyForWord={handleCopy}
              onDownloadMarkdown={handleDownloadMarkdown}
              onDownloadHtml={handleDownloadHtml}
              onLoadSample={handleLoadSample}
            />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
            <span className="rounded-md bg-slate-50 px-2 py-1">
              当前模板：<span className="font-medium text-slate-700">{selectedTemplate.name}</span>
            </span>
            <span className="rounded-md bg-slate-50 px-2 py-1">仅整理格式，不改写内容</span>
          </div>

          <div className="mt-2.5 flex justify-end border-t border-slate-100 pt-2.5">
            <button
              type="button"
              onClick={() => setIsStyleSettingsOpen(true)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-50"
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
              className="absolute inset-0 bg-slate-900/15"
              onClick={() => setIsStyleSettingsOpen(false)}
            />
            <aside
              aria-label="高级样式设置"
              role="dialog"
              aria-modal="true"
              className="absolute inset-y-0 left-0 flex w-full flex-col border-r border-slate-200 bg-white shadow-2xl sm:max-w-xl xl:max-w-2xl"
            >
              <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 px-4">
                <h2 className="text-base font-semibold text-slate-950">高级样式设置</h2>
                <button
                  type="button"
                  onClick={() => setIsStyleSettingsOpen(false)}
                  className="h-8 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-50"
                >
                  关闭
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                <StyleSettingsPanel
                  overrides={selectedOverrides}
                  onChange={handleStyleOverridesChange}
                  onReset={handleResetStyleOverrides}
                />
              </div>
            </aside>
          </div>
        ) : null}

        <section className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <EditorPanel value={rawInput} characterCount={characterCount} onChange={setRawInput} />
          <PreviewPanel
            html={processed.previewHtml}
            template={selectedTemplate}
            status={status}
            hasContent={processed.documentModel.blocks.length > 0}
          />
        </section>
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
