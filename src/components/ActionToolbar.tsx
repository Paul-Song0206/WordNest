import type { WordCopyMode } from "../types/document";

type ActionToolbarProps = {
  canUseOutput: boolean;
  copyMode: WordCopyMode;
  onCopyModeChange: (copyMode: WordCopyMode) => void;
  onCopyForWord: () => void;
  onDownloadMarkdown: () => void;
  onDownloadHtml: () => void;
  onLoadSample: () => void;
};

function ToolbarButton({
  label,
  onClick,
  primary = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        primary
          ? "h-10 rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          : "h-10 rounded-md border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
      }
    >
      {label}
    </button>
  );
}

export default function ActionToolbar({
  canUseOutput,
  copyMode,
  onCopyModeChange,
  onCopyForWord,
  onDownloadMarkdown,
  onDownloadHtml,
  onLoadSample,
}: ActionToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50/80 px-2.5 text-xs text-slate-500">
          <span>复制模式</span>
          <select
            value={copyMode}
            onChange={(event) => onCopyModeChange(event.target.value as WordCopyMode)}
            className="h-7 rounded border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
          >
            <option value="styled">保留样式</option>
            <option value="conservative">兼容模式</option>
          </select>
        </label>
        <ToolbarButton label="复制到 Word" onClick={onCopyForWord} primary disabled={!canUseOutput} />
        <ToolbarButton label="载入示例" onClick={onLoadSample} />
        <details className="relative">
          <summary
            aria-disabled={!canUseOutput}
            onClick={(event) => {
              if (!canUseOutput) {
                event.preventDefault();
              }
            }}
            className={
              canUseOutput
                ? "h-10 cursor-pointer list-none rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-slate-100"
                : "h-10 cursor-not-allowed list-none rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-400"
            }
          >
            导出
          </summary>
          <div className="absolute left-0 z-10 mt-2 flex min-w-44 flex-col gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/70 sm:left-auto sm:right-0">
            <button
              type="button"
              onClick={onDownloadMarkdown}
              disabled={!canUseOutput}
              className="rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              下载 Markdown
            </button>
            <button
              type="button"
              onClick={onDownloadHtml}
              disabled={!canUseOutput}
              className="rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              下载 HTML
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
