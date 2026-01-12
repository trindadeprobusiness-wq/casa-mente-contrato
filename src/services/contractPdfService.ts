import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";
import { saveAs } from "file-saver";

interface ContractPdfOptions {
  clienteNome: string;
  tipoContrato: string;
  marcaDaguaBase64?: string;
}

export async function generateContractPdf(
  contratoTexto: string,
  options: ContractPdfOptions
): Promise<void> {
  const { clienteNome, tipoContrato, marcaDaguaBase64 } = options;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Page settings
  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const margin = 70;
  const lineHeight = 16;
  const fontSize = 12;
  const titleFontSize = 14;

  // Prepare watermark image if provided
  let watermarkImage: Awaited<ReturnType<typeof pdfDoc.embedPng | typeof pdfDoc.embedJpg>> | null = null;
  let watermarkDims = { width: 0, height: 0 };

  if (marcaDaguaBase64) {
    try {
      const imageBytes = base64ToUint8Array(marcaDaguaBase64);
      
      // Detect image type from base64 header
      if (marcaDaguaBase64.includes("image/png")) {
        watermarkImage = await pdfDoc.embedPng(imageBytes);
      } else if (marcaDaguaBase64.includes("image/jpeg") || marcaDaguaBase64.includes("image/jpg")) {
        watermarkImage = await pdfDoc.embedJpg(imageBytes);
      } else {
        // Try PNG first, then JPG
        try {
          watermarkImage = await pdfDoc.embedPng(imageBytes);
        } catch {
          watermarkImage = await pdfDoc.embedJpg(imageBytes);
        }
      }

      // Scale watermark to fit nicely (max 300px width, keeping aspect ratio)
      const maxWidth = 300;
      const maxHeight = 200;
      const scale = Math.min(
        maxWidth / watermarkImage.width,
        maxHeight / watermarkImage.height,
        1
      );
      watermarkDims = {
        width: watermarkImage.width * scale,
        height: watermarkImage.height * scale,
      };
    } catch (error) {
      console.error("Error embedding watermark image:", error);
    }
  }

  // Parse and add text
  const lines = contratoTexto.split("\n");
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  // Function to add watermark to a page
  const addWatermarkToPage = (page: PDFPage) => {
    if (watermarkImage) {
      const x = (pageWidth - watermarkDims.width) / 2;
      const y = (pageHeight - watermarkDims.height) / 2;
      page.drawImage(watermarkImage, {
        x,
        y,
        width: watermarkDims.width,
        height: watermarkDims.height,
        opacity: 0.12, // Semi-transparent watermark
      });
    }
  };

  // Add watermark to first page
  addWatermarkToPage(currentPage);

  // Function to add a new page
  const addNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    yPosition = pageHeight - margin;
    addWatermarkToPage(currentPage);
    return currentPage;
  };

  // Function to draw text with word wrapping
  const drawText = (
    text: string,
    font: PDFFont,
    size: number,
    options: { isCentered?: boolean; extraSpaceBefore?: number; extraSpaceAfter?: number } = {}
  ) => {
    const { isCentered = false, extraSpaceBefore = 0, extraSpaceAfter = 0 } = options;
    const maxWidth = pageWidth - margin * 2;

    yPosition -= extraSpaceBefore;

    // Word wrap
    const words = text.split(" ");
    let currentLine = "";
    const wrappedLines: string[] = [];

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, size);

      if (testWidth > maxWidth && currentLine) {
        wrappedLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      wrappedLines.push(currentLine);
    }

    for (const line of wrappedLines) {
      if (yPosition < margin + lineHeight) {
        addNewPage();
      }

      const textWidth = font.widthOfTextAtSize(line, size);
      const x = isCentered ? (pageWidth - textWidth) / 2 : margin;

      currentPage.drawText(line, {
        x,
        y: yPosition,
        size,
        font,
        color: rgb(0, 0, 0),
      });

      yPosition -= lineHeight;
    }

    yPosition -= extraSpaceAfter;
  };

  // Process each line
  let isFirstLine = true;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines but add spacing
    if (!trimmedLine) {
      yPosition -= lineHeight * 0.5;
      continue;
    }

    // Detect title (first non-empty line or lines with "CONTRATO DE")
    if (isFirstLine || trimmedLine.toUpperCase().startsWith("CONTRATO DE")) {
      drawText(trimmedLine.toUpperCase(), fontBold, titleFontSize, {
        isCentered: true,
        extraSpaceBefore: 10,
        extraSpaceAfter: 20,
      });
      isFirstLine = false;
      continue;
    }

    // Detect clause headers
    if (
      /^CLÁUSULA\s/i.test(trimmedLine) ||
      /^(PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|SÉTIMA|OITAVA|NONA|DÉCIMA)/i.test(trimmedLine) ||
      /^(DAS PARTES|DO OBJETO|DO PRAZO|DO VALOR|DA RESCISÃO|DO FORO|DISPOSIÇÕES)/i.test(trimmedLine)
    ) {
      drawText(trimmedLine.toUpperCase(), fontBold, fontSize, {
        extraSpaceBefore: 15,
        extraSpaceAfter: 8,
      });
      continue;
    }

    // Detect section headers (all caps lines)
    if (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 5 && !trimmedLine.includes("R$")) {
      drawText(trimmedLine, fontBold, fontSize, {
        extraSpaceBefore: 12,
        extraSpaceAfter: 6,
      });
      continue;
    }

    // Detect signature lines
    if (trimmedLine.startsWith("_") || trimmedLine.includes("________________")) {
      yPosition -= 30;
      const signatureLine = "_".repeat(50);
      const lineWidth = fontRegular.widthOfTextAtSize(signatureLine, fontSize);
      currentPage.drawText(signatureLine, {
        x: (pageWidth - lineWidth) / 2,
        y: yPosition,
        size: fontSize,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
      yPosition -= lineHeight;
      continue;
    }

    // Detect party identification under signature
    if (
      /^(LOCADOR|LOCATÁRIO|VENDEDOR|COMPRADOR|CONTRATANTE|CONTRATADO|CORRETOR|TESTEMUNHA)/i.test(trimmedLine) ||
      /^(Nome:|CPF:|CRECI:)/i.test(trimmedLine)
    ) {
      const isBold = /^(LOCADOR|LOCATÁRIO|VENDEDOR|COMPRADOR|CONTRATANTE|CONTRATADO|CORRETOR|TESTEMUNHA)/i.test(trimmedLine);
      drawText(trimmedLine, isBold ? fontBold : fontRegular, fontSize, {
        isCentered: true,
        extraSpaceAfter: 4,
      });
      continue;
    }

    // Regular paragraph - justified text (left aligned for simplicity)
    drawText(trimmedLine, fontRegular, fontSize, {
      extraSpaceAfter: 6,
    });

    isFirstLine = false;
  }

  // Add page numbers
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const pageNumber = `${i + 1} / ${totalPages}`;
    const textWidth = fontRegular.widthOfTextAtSize(pageNumber, 10);
    page.drawText(pageNumber, {
      x: (pageWidth - textWidth) / 2,
      y: 30,
      size: 10,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  // Generate and save PDF
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });

  // Format filename
  const dataAtual = new Date().toISOString().split("T")[0];
  const nomeFormatado = clienteNome
    .replace(/\s+/g, "_")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const tipoFormatado = tipoContrato.replace(/\s+/g, "_");
  const fileName = `Contrato_${tipoFormatado}_${nomeFormatado}_${dataAtual}.pdf`;

  saveAs(blob, fileName);
}

function base64ToUint8Array(base64: string): Uint8Array {
  // Remove data URL prefix if present
  const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
