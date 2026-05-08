export type PdfSection = {
  title: string;
  body: string[];
};

function escapePdfText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function wrap(text: string, max = 88) {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines;
}

export function createReportPdf(input: {
  title: string;
  subtitle: string;
  sections: PdfSection[];
}) {
  const lines: string[] = [
    input.title,
    input.subtitle,
    "",
    ...input.sections.flatMap((section) => [
      section.title,
      ...section.body.flatMap((paragraph) => wrap(paragraph)),
      "",
    ]),
  ];

  const pages: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (current.length >= 48) {
      pages.push(current);
      current = [];
    }
    current.push(line);
  }

  if (current.length) pages.push(current);

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds: number[] = [];

  for (const pageLines of pages) {
    const commands = ["BT", "50 742 Td", "14 TL"];

    pageLines.forEach((line, index) => {
      const isTitle = index === 0;
      const isSubtitle = index === 1;
      const isSection = line && !line.startsWith("- ") && pageLines[index + 1] !== "";
      const font = isTitle || isSection ? "F2" : "F1";
      const size = isTitle ? 18 : isSubtitle ? 10 : isSection ? 13 : 10;
      commands.push(`/${font} ${size} Tf`);
      commands.push(`(${escapePdfText(line)}) Tj`);
      commands.push("T*");
    });

    commands.push("ET");
    const stream = commands.join("\n");
    const contentId = addObject(
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    );
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  }

  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index++) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index++) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "binary");
}
