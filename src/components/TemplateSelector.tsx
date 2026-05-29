import type { DocumentTemplate } from "../types/document";

type TemplateSelectorProps = {
  templates: DocumentTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
};

export default function TemplateSelector({
  templates,
  selectedTemplateId,
  onSelectTemplate,
}: TemplateSelectorProps) {
  return (
    <label className="grid gap-1.5 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:items-center">
      <span className="text-sm font-medium text-slate-700">模板</span>
      <select
        value={selectedTemplateId}
        onChange={(event) => onSelectTemplate(event.target.value)}
        className="h-9 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
      >
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
    </label>
  );
}
