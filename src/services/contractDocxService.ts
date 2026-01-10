import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageNumber,
  NumberFormat,
  Header,
  Footer,
  convertInchesToTwip,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";

interface ContractDocxOptions {
  clienteNome: string;
  tipoContrato: string;
  marcaDagua?: string;
}

export async function generateContractDocx(
  contratoTexto: string,
  options: ContractDocxOptions
): Promise<void> {
  const { clienteNome, tipoContrato, marcaDagua } = options;
  
  // Parse contract text into sections
  const paragraphs = parseContractText(contratoTexto);

  // Create watermark header if provided
  const headerChildren: Paragraph[] = [];
  if (marcaDagua) {
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: marcaDagua.toUpperCase(),
            font: "Arial",
            size: 72, // 36pt
            color: "CCCCCC", // Light gray
            bold: true,
          }),
        ],
      })
    );
  }

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: {
            font: "Times New Roman",
            size: 24, // 12pt = 24 half-points
          },
          paragraph: {
            spacing: {
              line: 360, // 1.5 line spacing
              after: 200,
            },
          },
        },
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          run: {
            bold: true,
            size: 28, // 14pt
          },
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400,
            },
          },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          run: {
            bold: true,
            size: 24,
          },
          paragraph: {
            spacing: {
              before: 400,
              after: 200,
            },
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.98), // ~2.5cm
              bottom: convertInchesToTwip(0.98),
              left: convertInchesToTwip(1.18), // ~3cm
              right: convertInchesToTwip(0.98),
            },
          },
        },
        headers: {
          default: new Header({
            children: headerChildren,
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES],
                    font: "Times New Roman",
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        },
        children: paragraphs,
      },
    ],
  });

  // Generate blob and download
  const blob = await Packer.toBlob(doc);
  
  // Format filename
  const dataAtual = new Date().toISOString().split("T")[0];
  const nomeFormatado = clienteNome.replace(/\s+/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tipoFormatado = tipoContrato.replace(/\s+/g, "_");
  const fileName = `Contrato_${tipoFormatado}_${nomeFormatado}_${dataAtual}.docx`;
  
  saveAs(blob, fileName);
}

function parseContractText(text: string): Paragraph[] {
  const lines = text.split("\n");
  const paragraphs: Paragraph[] = [];
  
  let isFirstLine = true;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines but add spacing
    if (!trimmedLine) {
      paragraphs.push(new Paragraph({ children: [] }));
      continue;
    }
    
    // Detect title (first non-empty line or lines with "CONTRATO DE")
    if (isFirstLine || trimmedLine.toUpperCase().startsWith("CONTRATO DE")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine.toUpperCase(),
              bold: true,
              font: "Times New Roman",
              size: 28,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
      isFirstLine = false;
      continue;
    }
    
    // Detect clause headers (CLÁUSULA, PRIMEIRA, etc.)
    if (
      /^CLÁUSULA\s/i.test(trimmedLine) ||
      /^(PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|SÉTIMA|OITAVA|NONA|DÉCIMA)/i.test(trimmedLine) ||
      /^(DAS PARTES|DO OBJETO|DO PRAZO|DO VALOR|DA RESCISÃO|DO FORO|DISPOSIÇÕES)/i.test(trimmedLine)
    ) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine.toUpperCase(),
              bold: true,
              font: "Times New Roman",
              size: 24,
            }),
          ],
          spacing: { before: 400, after: 200 },
        })
      );
      continue;
    }
    
    // Detect section headers (all caps lines)
    if (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 5 && !trimmedLine.includes("R$")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              bold: true,
              font: "Times New Roman",
              size: 24,
            }),
          ],
          spacing: { before: 300, after: 200 },
        })
      );
      continue;
    }
    
    // Detect signature lines
    if (trimmedLine.startsWith("_") || trimmedLine.includes("________________")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "_".repeat(50),
              font: "Times New Roman",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 100 },
        })
      );
      continue;
    }
    
    // Detect party identification under signature (names in bold)
    if (
      /^(LOCADOR|LOCATÁRIO|VENDEDOR|COMPRADOR|CONTRATANTE|CONTRATADO|CORRETOR|TESTEMUNHA)/i.test(trimmedLine) ||
      /^(Nome:|CPF:|CRECI:)/i.test(trimmedLine)
    ) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              bold: /^(LOCADOR|LOCATÁRIO|VENDEDOR|COMPRADOR|CONTRATANTE|CONTRATADO|CORRETOR|TESTEMUNHA)/i.test(trimmedLine),
              font: "Times New Roman",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })
      );
      continue;
    }
    
    // Regular paragraph - justified text
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: trimmedLine,
            font: "Times New Roman",
            size: 24,
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 },
      })
    );
    
    isFirstLine = false;
  }
  
  return paragraphs;
}

// Export function to preview contract as formatted text
export function formatContractForPreview(text: string): string {
  // Remove any markdown-like formatting
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/`/g, "")
    .trim();
}
