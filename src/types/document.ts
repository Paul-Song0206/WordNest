export type HeadingBlock = {
  type: "heading";
  level: 1 | 2 | 3 | 4;
  text: string;
  html: string;
  role?: "title" | "heading1" | "heading2" | "heading3" | "official-h1" | "official-h2" | "official-h3";
};

export type ParagraphBlock = {
  type: "paragraph";
  text: string;
  html: string;
  role?: "meta" | "salutation" | "numbered-paragraph" | "keyword";
};

export type BlockquoteBlock = {
  type: "blockquote";
  text: string;
  html: string;
};

export type CodeBlock = {
  type: "code";
  text: string;
  language?: string;
};

export type ListBlock = {
  type: "list";
  ordered: boolean;
  items: string[];
};

export type TableBlock = {
  type: "table";
  headers: string[];
  rows: string[][];
};

export type DocumentBlock =
  | HeadingBlock
  | ParagraphBlock
  | BlockquoteBlock
  | CodeBlock
  | ListBlock
  | TableBlock;

export type DocumentModel = {
  blocks: DocumentBlock[];
  cleanedMarkdown: string;
  classification?: Array<{
    kind: string;
    text: string;
  }>;
};

export type NumericListHandling = "native" | "plain";
export type StyleRole = "title" | "heading1" | "heading2" | "heading3" | "body" | "meta";

export type RoleStyleOverride = {
  mode: "custom";
  chineseFont?: string;
  latinFont?: string;
  fontSize?: string;
  bold?: boolean;
  textAlign?: "left" | "center" | "right" | "justify";
};

export type EffectiveRoleStyle = {
  fontFamily?: string;
  latinFontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: string;
};

export type TemplateStyleDefaults = {
  document: {
    color: string;
    fontFamily: string;
    latinFontFamily?: string;
    previewBackground: string;
    previewPadding: string;
  };
  headings: Record<
    1 | 2 | 3 | 4,
    {
      margin: string;
      lineHeight: string;
      fontSize: string;
      fontFamily: string;
      fontWeight: string;
      textAlign?: string;
    }
  >;
  paragraph: {
    margin: string;
    lineHeight: string;
    textIndent: string;
    fontSize: string;
    fontFamily: string;
    fontWeight?: string;
    textAlign?: string;
  };
  list: {
    margin: string;
    paddingLeft: string;
    lineHeight: string;
    fontSize: string;
    fontFamily: string;
    itemMargin: string;
    numericHandling?: NumericListHandling;
  };
  blockquote: {
    margin: string;
    padding: string;
    borderLeft: string;
    lineHeight: string;
    fontSize: string;
    fontFamily: string;
    previewBackground: string;
  };
  code: {
    margin: string;
    padding: string;
    fontFamily: string;
    fontSize: string;
    lineHeight: string;
    previewBackground: string;
  };
  table: {
    margin: string;
    border: string;
    cellPadding: string;
    fontSize: string;
    fontFamily: string;
    layout?: "full" | "three-line";
  };
  roleStyles?: Partial<Record<StyleRole, EffectiveRoleStyle>>;
};

export type UserStyleOverrides = {
  chineseFont?: string;
  latinFont?: string;
  bodyFontSize?: string;
  lineHeight?: string;
  firstLineIndent?: "0" | "2em";
  numericListHandling?: NumericListHandling;
  roleOverrides?: Partial<Record<StyleRole, RoleStyleOverride>>;
};

export type EffectiveDocumentStyles = TemplateStyleDefaults;

export type DocumentTemplate = {
  id: string;
  name: string;
  description?: string;
  notes?: string[];
  pageSetup?: {
    marginTop: string;
    marginBottom: string;
    marginLeft: string;
    marginRight: string;
    gutter?: string;
    gutterPosition?: "left";
  };
  sampleInput?: string;
  wordGuide?: {
    summary: string;
    sections: Array<{
      title: string;
      items: string[];
    }>;
  };
  styles: TemplateStyleDefaults;
};
