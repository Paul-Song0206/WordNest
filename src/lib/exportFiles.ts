import type { DocumentModel } from "../types/document";

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function documentToMarkdown(documentModel: DocumentModel): string {
  return documentModel.blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `${"#".repeat(block.level)} ${block.text}`;
        case "paragraph":
          return block.text;
        case "blockquote":
          return `> ${block.text}`;
        case "code":
          return `\`\`\`${block.language ?? ""}\n${block.text}\n\`\`\``;
        case "list":
          return block.items
            .map((item, index) => {
              const marker = block.ordered ? `${index + 1}.` : "-";
              return `${marker} ${stripTags(item)}`;
            })
            .join("\n");
        case "table": {
          const headerLine = `| ${block.headers.join(" | ")} |`;
          const separatorLine = `| ${block.headers.map(() => "---").join(" | ")} |`;
          const rowLines = block.rows.map((row) => `| ${row.map(stripTags).join(" | ")} |`);
          return [headerLine, separatorLine, ...rowLines].join("\n");
        }
      }
    })
    .join("\n\n");
}

export function downloadMarkdown(filename: string, documentModel: DocumentModel) {
  downloadFile(filename, documentToMarkdown(documentModel), "text/markdown;charset=utf-8");
}

export function downloadHtml(filename: string, html: string) {
  const documentHtml = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /><title>Word Friendly Export</title></head><body>${html}</body></html>`;
  downloadFile(filename, documentHtml, "text/html;charset=utf-8");
}
