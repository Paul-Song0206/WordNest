import type { RoleStyleOverride, StyleRole, UserStyleOverrides } from "../types/document";
import {
  bodyFontSizeOptions,
  chineseFontOptions,
  firstLineIndentOptions,
  latinFontOptions,
  lineHeightOptions,
  numericListHandlingOptions,
} from "../lib/styleSettings";

type StyleSettingsPanelProps = {
  overrides: UserStyleOverrides;
  onChange: (overrides: UserStyleOverrides) => void;
  onReset: () => void;
};

type OverrideKey = keyof UserStyleOverrides;
type GlobalOverrideKey = Exclude<OverrideKey, "roleOverrides">;

const roleOptions: Array<{ role: StyleRole; label: string }> = [
  { role: "title", label: "标题" },
  { role: "heading1", label: "一级标题" },
  { role: "heading2", label: "二级标题" },
  { role: "heading3", label: "三级标题" },
  { role: "body", label: "正文" },
  { role: "meta", label: "落款/日期" },
];

const roleModeOptions = [
  { value: "", label: "跟随模板" },
  { value: "custom", label: "自定义" },
] as const;

const roleFontSizeOptions = ["", "10.5pt", "11pt", "12pt", "13pt", "14pt", "15pt", "16pt", "18pt", "20pt", "22pt"] as const;

const boldOptions = [
  { value: "", label: "跟随模板" },
  { value: "true", label: "加粗" },
  { value: "false", label: "不加粗" },
] as const;

const textAlignOptions = [
  { value: "", label: "跟随模板" },
  { value: "left", label: "左对齐" },
  { value: "center", label: "居中" },
  { value: "right", label: "右对齐" },
  { value: "justify", label: "两端对齐" },
] as const;

export default function StyleSettingsPanel({
  overrides,
  onChange,
  onReset,
}: StyleSettingsPanelProps) {
  const updateOverride = (key: GlobalOverrideKey, value: string) => {
    onChange({
      ...overrides,
      [key]: value || undefined,
    });
  };

  const updateRoleMode = (role: StyleRole, value: string) => {
    const roleOverrides = { ...(overrides.roleOverrides ?? {}) };

    if (value === "custom") {
      roleOverrides[role] = roleOverrides[role] ?? { mode: "custom" };
    } else {
      delete roleOverrides[role];
    }

    onChange({
      ...overrides,
      roleOverrides: hasRoleOverrides(roleOverrides) ? roleOverrides : undefined,
    });
  };

  const updateRoleTextOverride = (
    role: StyleRole,
    key: "chineseFont" | "latinFont" | "fontSize",
    value: string,
  ) => {
    const roleOverrides = { ...(overrides.roleOverrides ?? {}) };
    const nextOverride: RoleStyleOverride = { ...(roleOverrides[role] ?? { mode: "custom" }) };
    nextOverride[key] = value || undefined;
    roleOverrides[role] = nextOverride;

    onChange({
      ...overrides,
      roleOverrides,
    });
  };

  const updateRoleBoldOverride = (role: StyleRole, value: string) => {
    const roleOverrides = { ...(overrides.roleOverrides ?? {}) };
    const nextOverride: RoleStyleOverride = { ...(roleOverrides[role] ?? { mode: "custom" }) };
    nextOverride.bold = value === "" ? undefined : value === "true";
    roleOverrides[role] = nextOverride;

    onChange({
      ...overrides,
      roleOverrides,
    });
  };

  const updateRoleAlignOverride = (role: StyleRole, value: string) => {
    const roleOverrides = { ...(overrides.roleOverrides ?? {}) };
    const nextOverride: RoleStyleOverride = { ...(roleOverrides[role] ?? { mode: "custom" }) };
    nextOverride.textAlign = (value || undefined) as RoleStyleOverride["textAlign"];
    roleOverrides[role] = nextOverride;

    onChange({
      ...overrides,
      roleOverrides,
    });
  };

  const resetRoleOverrides = () => {
    onChange({
      ...overrides,
      roleOverrides: undefined,
    });
  };

  return (
    <section className="mt-2.5 rounded-md border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">样式覆盖</h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            跟随模板 = 使用当前模板的默认排版规则。
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="h-8 shrink-0 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
        >
          恢复模板默认
        </button>
      </div>

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField
          label="中文字体"
          value={overrides.chineseFont ?? ""}
          onChange={(value) => updateOverride("chineseFont", value)}
          options={chineseFontOptions}
        />
        <SelectField
          label="英文与数字"
          value={overrides.latinFont ?? ""}
          onChange={(value) => updateOverride("latinFont", value)}
          options={latinFontOptions}
        />
        <SelectField
          label="正文基准字号"
          value={overrides.bodyFontSize ?? ""}
          onChange={(value) => updateOverride("bodyFontSize", value)}
          options={bodyFontSizeOptions.map((value) => ({
            value,
            label: value || "跟随模板",
          }))}
        />
        <SelectField
          label="行距"
          value={overrides.lineHeight ?? ""}
          onChange={(value) => updateOverride("lineHeight", value)}
          options={lineHeightOptions.map((value) => ({
            value,
            label: value || "跟随模板",
          }))}
        />
        <SelectField
          label="首行缩进"
          value={overrides.firstLineIndent ?? ""}
          onChange={(value) => updateOverride("firstLineIndent", value)}
          options={firstLineIndentOptions}
        />
        <SelectField
          label="编号处理"
          value={overrides.numericListHandling ?? ""}
          onChange={(value) => updateOverride("numericListHandling", value)}
          options={numericListHandlingOptions}
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        字体显示取决于本机和 Word 是否安装对应字体；未安装时会自动使用替代字体。
      </p>

      <div className="mt-3 border-t border-slate-200 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">模板细则</h3>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              角色自定义会优先于上方全局设置。
            </p>
          </div>
          <button
            type="button"
            onClick={resetRoleOverrides}
            className="h-8 shrink-0 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            恢复模板默认
          </button>
        </div>

        <div className="mt-2.5 grid gap-2">
          {roleOptions.map(({ role, label }) => {
            const roleOverride = overrides.roleOverrides?.[role];
            const isCustom = roleOverride?.mode === "custom";

            return (
              <div key={role} className="rounded-md border border-slate-200 bg-white p-2">
                <div className="grid gap-2 md:grid-cols-[5rem_7rem_repeat(5,minmax(0,1fr))] md:items-end">
                  <div className="pb-1 text-xs font-semibold text-slate-700">{label}</div>
                  <SelectField
                    label="模式"
                    value={isCustom ? "custom" : ""}
                    onChange={(value) => updateRoleMode(role, value)}
                    options={roleModeOptions}
                  />
                  <SelectField
                    label="中文字体"
                    value={roleOverride?.chineseFont ?? ""}
                    onChange={(value) => updateRoleTextOverride(role, "chineseFont", value)}
                    options={chineseFontOptions}
                    disabled={!isCustom}
                  />
                  <SelectField
                    label="英文与数字"
                    value={roleOverride?.latinFont ?? ""}
                    onChange={(value) => updateRoleTextOverride(role, "latinFont", value)}
                    options={latinFontOptions}
                    disabled={!isCustom}
                  />
                  <SelectField
                    label="字号"
                    value={roleOverride?.fontSize ?? ""}
                    onChange={(value) => updateRoleTextOverride(role, "fontSize", value)}
                    options={roleFontSizeOptions.map((value) => ({
                      value,
                      label: value || "跟随模板",
                    }))}
                    disabled={!isCustom}
                  />
                  <SelectField
                    label="加粗"
                    value={roleOverride?.bold === undefined ? "" : String(roleOverride.bold)}
                    onChange={(value) => updateRoleBoldOverride(role, value)}
                    options={boldOptions}
                    disabled={!isCustom}
                  />
                  <SelectField
                    label="对齐"
                    value={roleOverride?.textAlign ?? ""}
                    onChange={(value) => updateRoleAlignOverride(role, value)}
                    options={textAlignOptions}
                    disabled={!isCustom}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function hasRoleOverrides(roleOverrides: Partial<Record<StyleRole, RoleStyleOverride>>): boolean {
  return Object.keys(roleOverrides).length > 0;
}

type SelectOption = {
  value: string;
  label: string;
};

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-8 min-w-0 rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value || "default"}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
