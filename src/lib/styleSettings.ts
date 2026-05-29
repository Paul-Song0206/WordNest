import type {
  EffectiveDocumentStyles,
  EffectiveRoleStyle,
  RoleStyleOverride,
  StyleRole,
  TemplateStyleDefaults,
  UserStyleOverrides,
} from "../types/document";

export const chineseFontOptions = [
  { value: "", label: "跟随模板", css: "" },
  { value: "simsun", label: "宋体 / SimSun", css: "SimSun, 宋体, serif" },
  {
    value: "fangsong",
    label: "仿宋 / FangSong",
    css: "'FangSong_GB2312', '仿宋_GB2312', FangSong, 仿宋, SimFang, STFangsong, serif",
  },
  { value: "kaiti", label: "楷体 / KaiTi", css: "'KaiTi_GB2312', '楷体_GB2312', KaiTi, 楷体, STKaiti, serif" },
  { value: "simhei", label: "黑体 / SimHei", css: "SimHei, 黑体, 'Microsoft YaHei', sans-serif" },
  { value: "yahei", label: "微软雅黑 / Microsoft YaHei", css: "'Microsoft YaHei', 微软雅黑, sans-serif" },
] as const;

export const latinFontOptions = [
  { value: "", label: "跟随模板", css: "" },
  { value: "times", label: "Times New Roman", css: "'Times New Roman', 'Nimbus Roman No9 L', serif" },
  { value: "arial", label: "Arial", css: "Arial, Helvetica, sans-serif" },
  { value: "calibri", label: "Calibri", css: "Calibri, 'Segoe UI', sans-serif" },
] as const;

export const bodyFontSizeOptions = ["", "10.5pt", "12pt", "14pt", "16pt"] as const;
export const lineHeightOptions = ["", "1.0", "1.25", "1.5", "1.75", "2.0"] as const;
export const firstLineIndentOptions = [
  { value: "", label: "跟随模板" },
  { value: "0", label: "无" },
  { value: "2em", label: "2 字符" },
] as const;
export const numericListHandlingOptions = [
  { value: "", label: "跟随模板" },
  { value: "native", label: "原生列表" },
  { value: "plain", label: "普通编号段落" },
] as const;

export function mergeStyles(
  templateStyles: TemplateStyleDefaults,
  overrides: UserStyleOverrides,
): EffectiveDocumentStyles {
  const effective = cloneStyles(templateStyles);
  const latinFontFamily = getLatinFontCss(overrides.latinFont);
  const applyFontOverride = <T extends { fontFamily: string }>(target: T, fallbackFontFamily: string) => {
    const fontFamily = createOverrideFontFamily(overrides, fallbackFontFamily);
    if (fontFamily) {
      target.fontFamily = fontFamily;
    }
  };

  if (latinFontFamily) {
    effective.document.latinFontFamily = latinFontFamily;
  } else if (overrides.chineseFont) {
    effective.document.latinFontFamily =
      templateStyles.document.latinFontFamily ?? templateStyles.document.fontFamily;
  }

  applyFontOverride(effective.document, templateStyles.document.fontFamily);
  applyFontOverride(effective.paragraph, templateStyles.paragraph.fontFamily);
  applyFontOverride(effective.list, templateStyles.list.fontFamily);
  applyFontOverride(effective.blockquote, templateStyles.blockquote.fontFamily);
  applyFontOverride(effective.table, templateStyles.table.fontFamily);

  ([1, 2, 3, 4] as const).forEach((level) => {
    applyFontOverride(effective.headings[level], templateStyles.headings[level].fontFamily);
  });

  if (overrides.bodyFontSize) {
    applyFontSizeScale(effective, templateStyles, overrides.bodyFontSize);
  }

  if (overrides.lineHeight) {
    effective.paragraph.lineHeight = overrides.lineHeight;
    effective.list.lineHeight = overrides.lineHeight;
    effective.blockquote.lineHeight = overrides.lineHeight;
  }

  if (overrides.firstLineIndent) {
    effective.paragraph.textIndent = overrides.firstLineIndent;
  }

  if (overrides.numericListHandling) {
    effective.list.numericHandling = overrides.numericListHandling;
  }

  applyRoleOverrides(effective, overrides);

  return effective;
}

function cloneStyles(styles: TemplateStyleDefaults): TemplateStyleDefaults {
  return {
    document: { ...styles.document },
    headings: {
      1: { ...styles.headings[1] },
      2: { ...styles.headings[2] },
      3: { ...styles.headings[3] },
      4: { ...styles.headings[4] },
    },
    paragraph: { ...styles.paragraph },
    list: { ...styles.list },
    blockquote: { ...styles.blockquote },
    code: { ...styles.code },
    table: { ...styles.table },
    roleStyles: styles.roleStyles ? cloneRoleStyles(styles.roleStyles) : undefined,
  };
}

function cloneRoleStyles(
  styles: Partial<Record<StyleRole, EffectiveRoleStyle>>,
): Partial<Record<StyleRole, EffectiveRoleStyle>> {
  return Object.fromEntries(
    Object.entries(styles).map(([role, style]) => [role, { ...style }]),
  ) as Partial<Record<StyleRole, EffectiveRoleStyle>>;
}

function createOverrideFontFamily(
  overrides: UserStyleOverrides,
  fallbackFontFamily: string,
): string | null {
  const chineseFont = getChineseFontCss(overrides.chineseFont);

  if (!chineseFont) {
    return null;
  }

  return [chineseFont, fallbackFontFamily].filter(Boolean).join(", ");
}

function getChineseFontCss(value: string | undefined): string {
  return chineseFontOptions.find((option) => option.value === value)?.css ?? "";
}

function getLatinFontCss(value: string | undefined): string {
  return latinFontOptions.find((option) => option.value === value)?.css ?? "";
}

function applyRoleOverrides(effective: TemplateStyleDefaults, overrides: UserStyleOverrides) {
  if (!overrides.roleOverrides) {
    return;
  }

  (Object.entries(overrides.roleOverrides) as Array<[StyleRole, RoleStyleOverride | undefined]>).forEach(
    ([role, override]) => {
      if (!override || override.mode !== "custom") {
        return;
      }

      if (role === "meta") {
        applyMetaRoleOverride(effective, role, override);
        return;
      }

      const target = getRoleTarget(effective, role);
      if (!target) {
        return;
      }

      const fallbackLatinFontFamily = target.fontFamily;
      applyRoleTypography(target, override);
      applyRoleLatinOverride(effective, role, override, fallbackLatinFontFamily);
    },
  );
}

function getRoleTarget(
  effective: TemplateStyleDefaults,
  role: StyleRole,
): { fontFamily: string; fontSize: string; fontWeight?: string; textAlign?: string } | null {
  switch (role) {
    case "title":
      return effective.headings[1];
    case "heading1":
      return effective.headings[2];
    case "heading2":
      return effective.headings[3];
    case "heading3":
      return effective.headings[4];
    case "body":
      return effective.paragraph;
    case "meta":
      return null;
  }
}

function applyRoleTypography(
  target: { fontFamily: string; fontSize: string; fontWeight?: string; textAlign?: string },
  override: RoleStyleOverride,
) {
  const chineseFont = getChineseFontCss(override.chineseFont);

  if (chineseFont) {
    target.fontFamily = [chineseFont, target.fontFamily].filter(Boolean).join(", ");
  }

  if (override.fontSize) {
    target.fontSize = override.fontSize;
  }

  if (override.bold !== undefined) {
    target.fontWeight = override.bold ? "700" : "400";
  }

  if (override.textAlign) {
    target.textAlign = override.textAlign;
  }
}

function applyMetaRoleOverride(
  effective: TemplateStyleDefaults,
  role: StyleRole,
  override: RoleStyleOverride,
) {
  const roleStyle = getWritableRoleStyle(effective, role);
  const chineseFont = getChineseFontCss(override.chineseFont);
  const latinFont = getLatinFontCss(override.latinFont);
  const fallbackLatinFontFamily = effective.paragraph.fontFamily;

  if (chineseFont) {
    roleStyle.fontFamily = [chineseFont, effective.paragraph.fontFamily].filter(Boolean).join(", ");
  }

  if (latinFont) {
    roleStyle.latinFontFamily = latinFont;
  } else if (chineseFont) {
    roleStyle.latinFontFamily = effective.document.latinFontFamily ?? fallbackLatinFontFamily;
  }

  if (override.fontSize) {
    roleStyle.fontSize = override.fontSize;
  }

  if (override.bold !== undefined) {
    roleStyle.fontWeight = override.bold ? "700" : "400";
  }

  if (override.textAlign) {
    roleStyle.textAlign = override.textAlign;
  }
}

function applyRoleLatinOverride(
  effective: TemplateStyleDefaults,
  role: StyleRole,
  override: RoleStyleOverride,
  fallbackLatinFontFamily: string,
) {
  const latinFont = getLatinFontCss(override.latinFont);

  if (latinFont) {
    getWritableRoleStyle(effective, role).latinFontFamily = latinFont;
    return;
  }

  if (getChineseFontCss(override.chineseFont)) {
    getWritableRoleStyle(effective, role).latinFontFamily =
      effective.document.latinFontFamily ?? fallbackLatinFontFamily;
  }
}

function getWritableRoleStyle(effective: TemplateStyleDefaults, role: StyleRole): EffectiveRoleStyle {
  effective.roleStyles = effective.roleStyles ?? {};
  effective.roleStyles[role] = effective.roleStyles[role] ? { ...effective.roleStyles[role] } : {};
  return effective.roleStyles[role];
}

function applyFontSizeScale(
  effective: TemplateStyleDefaults,
  templateStyles: TemplateStyleDefaults,
  bodyFontSize: string,
) {
  const templateBodySize = parsePointSize(templateStyles.paragraph.fontSize);
  const overrideBodySize = parsePointSize(bodyFontSize);

  if (!templateBodySize || !overrideBodySize) {
    return;
  }

  effective.paragraph.fontSize = bodyFontSize;
  effective.list.fontSize = bodyFontSize;
  effective.table.fontSize = scalePointSize(templateStyles.table.fontSize, templateBodySize, overrideBodySize);
  effective.blockquote.fontSize = scalePointSize(
    templateStyles.blockquote.fontSize,
    templateBodySize,
    overrideBodySize,
  );
  effective.code.fontSize = scalePointSize(templateStyles.code.fontSize, templateBodySize, overrideBodySize);

  ([1, 2, 3, 4] as const).forEach((level) => {
    effective.headings[level].fontSize = scalePointSize(
      templateStyles.headings[level].fontSize,
      templateBodySize,
      overrideBodySize,
    );
  });
}

function parsePointSize(value: string): number | null {
  const match = value.match(/^(\d+(?:\.\d+)?)pt$/);
  return match ? Number.parseFloat(match[1]) : null;
}

function scalePointSize(value: string, templateBodySize: number, overrideBodySize: number): string {
  const pointSize = parsePointSize(value);

  if (!pointSize) {
    return value;
  }

  const scaled = (pointSize / templateBodySize) * overrideBodySize;
  const rounded = Math.round(scaled * 10) / 10;

  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}pt`;
}
