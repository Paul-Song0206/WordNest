type ActionToolbarProps = {
  canUseOutput: boolean;
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
          ? "h-9 rounded-md bg-indigo-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          : "h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
      }
    >
      {label}
    </button>
  );
}

export default function ActionToolbar({
  canUseOutput,
  onCopyForWord,
  onDownloadMarkdown,
  onDownloadHtml,
  onLoadSample,
}: ActionToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
      <div className="flex flex-wrap items-center gap-2">
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
                ? "h-9 cursor-pointer list-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-slate-100"
                : "h-9 cursor-not-allowed list-none rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-400"
            }
          >
            导出
          </summary>
          <div className="absolute left-0 z-10 mt-2 flex min-w-44 flex-col gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg sm:left-auto sm:right-0">
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
