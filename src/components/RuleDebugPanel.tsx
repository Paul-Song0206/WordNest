import type { LineClassification, StableBlock } from "../types/document";

type RuleDebugPanelProps = {
  rows: LineClassification[];
  blocks: StableBlock[];
  hasContent: boolean;
};

export default function RuleDebugPanel({ rows, blocks, hasContent }: RuleDebugPanelProps) {
  return (
    <details className="rounded-lg border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-200/50 md:p-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
        规则调试
        <span className="ml-2 rounded-md bg-slate-50 px-2 py-1 text-xs font-normal text-slate-500 ring-1 ring-slate-200/70">
          {hasContent ? `${rows.length} 行，${blocks.length} 个稳定块` : "粘贴文本后显示分类结果"}
        </span>
      </summary>

      <div className="mt-3 overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="max-h-80 overflow-auto">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-500 shadow-[0_1px_0_rgba(226,232,240,1)]">
              <tr>
                <th className="w-12 border-b border-slate-200 px-2 py-2 font-semibold">行</th>
                <th className="min-w-56 border-b border-slate-200 px-2 py-2 font-semibold">原文</th>
                <th className="min-w-36 border-b border-slate-200 px-2 py-2 font-semibold">分类</th>
                <th className="min-w-40 border-b border-slate-200 px-2 py-2 font-semibold">规则 ID</th>
                <th className="w-20 border-b border-slate-200 px-2 py-2 font-semibold">置信度</th>
                <th className="w-24 border-b border-slate-200 px-2 py-2 font-semibold">输出</th>
                <th className="min-w-56 border-b border-slate-200 px-2 py-2 font-semibold">原因</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {hasContent && rows.length ? (
                rows.map((row) => (
                  <tr key={`${row.lineNumber}-${row.ruleId}-${row.normalizedText}`}>
                    <td className="align-top px-2 py-2 text-slate-400">{row.lineNumber}</td>
                    <td className="align-top px-2 py-2">
                      <span className="line-clamp-3 whitespace-pre-wrap">{row.rawText}</span>
                    </td>
                    <td className="align-top px-2 py-2 font-medium text-slate-800">{row.classification}</td>
                    <td className="align-top px-2 py-2 font-mono text-[11px] text-indigo-700">{row.ruleId}</td>
                    <td className="align-top px-2 py-2">{row.confidence.toFixed(2)}</td>
                    <td className="align-top px-2 py-2 font-mono text-[11px] text-slate-500">{row.output || "-"}</td>
                    <td className="align-top px-2 py-2 text-slate-500">{row.reasons.join("; ")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-2 py-6 text-center text-slate-400" colSpan={7}>
                    暂无分类结果。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
