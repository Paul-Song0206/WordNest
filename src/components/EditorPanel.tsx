type EditorPanelProps = {
  value: string;
  characterCount: number;
  onChange: (value: string) => void;
};

export default function EditorPanel({ value, characterCount, onChange }: EditorPanelProps) {
  return (
    <section className="flex min-h-[36rem] flex-col gap-3 rounded-lg border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-200/50 md:p-4">
      <div className="flex min-h-12 flex-wrap items-end justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base font-semibold leading-6 text-slate-950">原始文本</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">粘贴需要整理的中文文本或半 Markdown 内容。</p>
        </div>
        <span className="rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80">
          {characterCount} 字
        </span>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[30rem] w-full flex-1 resize-none rounded-md border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm leading-7 text-slate-900 outline-none transition placeholder:text-slate-400/80 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
        placeholder="粘贴报告、论文段落、公文草稿、会议纪要或带列表/表格的 Markdown。"
      />
    </section>
  );
}
