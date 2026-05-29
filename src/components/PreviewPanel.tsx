import type { DocumentTemplate } from "../types/document";

type PreviewPanelProps = {
  html: string;
  template: DocumentTemplate;
  status: string;
  hasContent: boolean;
};

export default function PreviewPanel({ html, template, status, hasContent }: PreviewPanelProps) {
  return (
    <section className="flex min-h-[34rem] flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:p-4">
      <div className="relative z-10 flex min-h-12 shrink-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-950">排版预览</h2>
          <p className="mt-1 text-xs text-slate-500">
            {template.name}
            {template.description ? <span className="hidden sm:inline"> · {template.description}</span> : null}
          </p>
          {template.notes?.length ? (
            <div className="mt-1 hidden space-y-1 2xl:block">
              {template.notes.map((note) => (
                <p key={note} className="max-w-2xl text-xs leading-5 text-slate-400">
                  {note}
                </p>
              ))}
            </div>
          ) : null}
        </div>
        {status ? (
          <div className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {status}
          </div>
        ) : null}
      </div>

      <div className="preview-surface min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-slate-100/80 p-3 md:p-4">
        <div className="mx-auto min-h-full max-w-[50rem] rounded-sm border border-slate-200 bg-[#fffef9] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.08)] md:p-8">
          {hasContent ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div>
              <p className="max-w-md text-sm leading-6 text-slate-400/90">
                粘贴文本后，这里会显示接近 Word 页面效果的预览。
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
