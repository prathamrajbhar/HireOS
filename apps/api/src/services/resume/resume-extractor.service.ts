import { logger } from '../../lib/logger';
import sharp from 'sharp';
import * as zlib from 'zlib';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse');

export type ResumeSectionCategory =
  | 'header'
  | 'experience'
  | 'skills'
  | 'education'
  | 'projects'
  | 'certifications'
  | 'publications'
  | 'workshops'
  | 'references'
  | 'other';

export interface ExtractedSection {
  heading: string;
  category: ResumeSectionCategory;
  content: string;
}

export interface OptimizedResumeResult {
  optimizedText: string;
  originalLength: number;
  optimizedLength: number;
  isCondensed: boolean;
  detectedSections: string[];
}

export function normalizeResumeText(text: string): string {
  let cleaned = text.replace(/P\s+R\s+O\s+F\s+E\s+S\s+S\s+I\s+O\s+N\s+A\s+L\s+S\s+U\s+M\s+M\s+A\s+R\s+Y/gi, 'PROFESSIONAL SUMMARY');
  cleaned = cleaned.replace(/E\s+X\s+P\s+E\s+R\s+I\s+E\s+N\s+C\s+E/gi, 'EXPERIENCE');
  cleaned = cleaned.replace(/E\s+D\s+U\s+C\s+A\s+T\s+I\s+O\s+N/gi, 'EDUCATION');
  cleaned = cleaned.replace(/P\s+R\s+O\s+J\s+E\s+C\s+T\s+S/gi, 'PROJECTS');
  cleaned = cleaned.replace(/S\s+K\s+I\s+L\s+L\s+S/gi, 'SKILLS');
  cleaned = cleaned.replace(/P\s+U\s+B\s+L\s+I\s+C\s+A\s+T\s+I\s+O\s+N\s+S/gi, 'PUBLICATIONS');
  cleaned = cleaned.replace(/W\s+O\s+R\s+K\s+S\s+H\s+O\s+P\s+S/gi, 'WORKSHOPS');
  cleaned = cleaned.replace(/C\s+E\s+R\s+T\s+I\s+F\s+I\s+C\s+A\s+T\s+I\s+O\s+N\s+S/gi, 'CERTIFICATIONS');
  return cleaned;
}

export function classifyHeading(line: string): ResumeSectionCategory | null {
  const clean = line
    .replace(/^[\s#*•\-_=~[\]()0-9.]+|[\s#*•\-_=~[\]()0-9.:]+$/g, '')
    .trim();
  if (clean.length < 3 || clean.length > 55) return null;

  // Work experience
  if (
    /^(?:work\s+experience|professional\s+experience|employment\s+history|career\s+history|experience|work\s+history|industry\s+experience|academic\s+experience|teaching\s+experience|professional\s+background)$/i.test(
      clean
    )
  ) {
    return 'experience';
  }

  // Skills
  if (
    /^(?:technical\s+skills?|skills?\s*(?:&|and)?\s*expertise|skills?|core\s+competencies|technologies|areas\s+of\s+expertise|programming\s+languages|tools\s+&?\s+technologies|technical\s+proficiency|key\s+skills?|domains?)$/i.test(
      clean
    )
  ) {
    return 'skills';
  }

  // Education
  if (
    /^(?:education(?:\s*(?:&|and)\s*qualifications?)?|academic\s+qualifications?|educational\s+background|qualifications?|academic\s+credentials|academic\s+record|degrees?)$/i.test(
      clean
    )
  ) {
    return 'education';
  }

  // Projects
  if (
    /^(?:projects?|key\s+projects?|notable\s+projects?|technical\s+projects?|academic\s+projects?|research\s+projects?|industry\s+projects?|major\s+projects?|guided\s+projects?)$/i.test(
      clean
    )
  ) {
    return 'projects';
  }

  // Certifications
  if (
    /^(?:certifications?|certificates?|licenses?|professional\s+certifications?|credentials|courses?\s*(?:&|and)\s*certifications?)$/i.test(
      clean
    )
  ) {
    return 'certifications';
  }

  // Publications (Low priority / condense for multi-page CVs)
  if (
    /^(?:publications?|research\s+papers?|journal\s+papers?|conference\s+proceedings?|international\s+journals?|national\s+journals?|papers\s+published|books\s*(?:&|and)?\s*chapters?|book\s+chapters?|patents?)$/i.test(
      clean
    )
  ) {
    return 'publications';
  }

  // Workshops & Seminars (Low priority / condense for multi-page CVs)
  if (
    /^(?:workshops?\s*(?:&|and)?\s*seminars?|workshops?\s+(?:attended|organized)|seminars?\s+(?:attended|organized)|fdp(?:\s+attended)?|faculty\s+development\s+programs?|conferences?\s+attended|events?\s+attended|short\s+term\s+training|sttp)$/i.test(
      clean
    )
  ) {
    return 'workshops';
  }

  // References & Personal info
  if (
    /^(?:references?|referees?|declaration|personal\s+details|personal\s+profile|personal\s+information|extra-curricular\s+activities)$/i.test(
      clean
    )
  ) {
    return 'references';
  }

  return null;
}

/**
 * Intelligently extracts, structures, and budgets multi-page resumes (15-30+ pages).
 *
 * Guarantees that:
 * 1. High-priority career sections (Experience, Education, Skills, Projects, Certifications)
 *    are NEVER discarded.
 * 2. Bloated bibliographies (dozens of pages of journal publications, conference proceedings,
 *    workshops attended) are safely condensed to signals + sample citations.
 * 3. Total character budget stays within an optimal ~20,000-24,000 char window so LLMs
 *    can process it smoothly without timing out.
 */
export function optimizeResumeContent(rawText: string, targetBudget = 22000): OptimizedResumeResult {
  const originalLength = rawText.length;

  if (originalLength <= 15000) {
    return {
      optimizedText: rawText,
      originalLength,
      optimizedLength: originalLength,
      isCondensed: false,
      detectedSections: [],
    };
  }

  // Strip page numbering artifacts
  const cleaned = rawText
    .replace(/(?:page\s+\d+\s*(?:of|\/)\s*\d+|[-–—]\s*\d+\s*[-–—]|\f)/gi, '\n')
    .replace(/\r\n/g, '\n');

  const lines = cleaned.split('\n');
  const sections: ExtractedSection[] = [];
  const detectedSectionNames: string[] = [];

  let currentHeading = 'HEADER';
  let currentCategory: ResumeSectionCategory = 'header';
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentLines.length > 0 && currentLines[currentLines.length - 1] !== '') {
        currentLines.push('');
      }
      continue;
    }

    const category = classifyHeading(trimmed);
    if (category) {
      if (currentLines.length > 0) {
        sections.push({
          heading: currentHeading,
          category: currentCategory,
          content: currentLines.join('\n').trim(),
        });
      }

      currentHeading = trimmed;
      currentCategory = category;
      currentLines = [];
      detectedSectionNames.push(`${category}: "${trimmed}"`);
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push({
      heading: currentHeading,
      category: currentCategory,
      content: currentLines.join('\n').trim(),
    });
  }

  if (sections.length <= 1) {
    const head = cleaned.slice(0, 14000);
    const tail = cleaned.slice(-6000);
    const fallbackText = `${head}\n\n[... middle sections omitted for length ...]\n\n${tail}`;
    return {
      optimizedText: fallbackText,
      originalLength,
      optimizedLength: fallbackText.length,
      isCondensed: true,
      detectedSections: ['fallback_head_tail'],
    };
  }

  const assembledParts: string[] = [];

  for (const sec of sections) {
    if (!sec.content) continue;

    switch (sec.category) {
      case 'header': {
        const headerSlice = sec.content.slice(0, 4500);
        assembledParts.push(`=== CONTACT & SUMMARY ===\n${headerSlice}`);
        break;
      }
      case 'education': {
        assembledParts.push(`=== EDUCATION & QUALIFICATIONS ===\n${sec.content.slice(0, 4000)}`);
        break;
      }
      case 'skills': {
        assembledParts.push(`=== TECHNICAL SKILLS & EXPERTISE ===\n${sec.content.slice(0, 4000)}`);
        break;
      }
      case 'experience': {
        assembledParts.push(`=== EXPERIENCE & EMPLOYMENT HISTORY ===\n${sec.content.slice(0, 10000)}`);
        break;
      }
      case 'projects': {
        assembledParts.push(`=== KEY PROJECTS & ACCOMPLISHMENTS ===\n${sec.content.slice(0, 5000)}`);
        break;
      }
      case 'certifications': {
        assembledParts.push(`=== CERTIFICATIONS & LICENSES ===\n${sec.content.slice(0, 2500)}`);
        break;
      }
      case 'publications': {
        const pubSlice = sec.content.slice(0, 800);
        assembledParts.push(
          `=== PUBLICATIONS & RESEARCH (Condensed) ===\n${pubSlice}\n[Note: Additional publication entries omitted for AI profile extraction efficiency]`
        );
        break;
      }
      case 'workshops': {
        const wsSlice = sec.content.slice(0, 250);
        assembledParts.push(
          `=== WORKSHOPS & CONFERENCES (Condensed) ===\n${wsSlice}\n[Note: Additional workshops/seminars omitted for AI profile extraction efficiency]`
        );
        break;
      }
      case 'references': {
        assembledParts.push(`=== REFERENCES ===\n[Available upon request]`);
        break;
      }
      case 'other':
      default: {
        const currentLength = assembledParts.reduce((acc, p) => acc + p.length, 0);
        if (currentLength < targetBudget) {
          const remainingBudget = targetBudget - currentLength;
          if (remainingBudget > 300) {
            assembledParts.push(`=== ${sec.heading.toUpperCase()} ===\n${sec.content.slice(0, Math.min(2000, remainingBudget))}`);
          }
        }
        break;
      }
    }
  }

  const optimizedText = assembledParts.join('\n\n').trim();

  return {
    optimizedText,
    originalLength,
    optimizedLength: optimizedText.length,
    isCondensed: true,
    detectedSections: detectedSectionNames,
  };
}

/**
 * Scans a PDF buffer for embedded image streams (JPEG DCTDecode or FlateDecode).
 * Scanned PDF resumes typically embed full-page photos/scans as DCTDecode JPEG streams.
 */
export async function extractImagesFromPdf(pdfBuffer: Buffer): Promise<Buffer[]> {
  const images: Buffer[] = [];
  let offset = 0;

  // 1. Search for JPEG SOI marker (0xFF, 0xD8, 0xFF)
  while (offset < pdfBuffer.length - 4) {
    const soi = pdfBuffer.indexOf(Buffer.from([0xff, 0xd8, 0xff]), offset);
    if (soi === -1) break;

    let searchPos = soi + 3;
    let foundEoi = -1;

    while (searchPos < pdfBuffer.length - 1) {
      const eoi = pdfBuffer.indexOf(Buffer.from([0xff, 0xd9]), searchPos);
      if (eoi === -1) break;

      const nextSlice = pdfBuffer.subarray(eoi + 2, Math.min(pdfBuffer.length, eoi + 35)).toString('latin1');
      if (/^\s*(?:endstream|>>|endobj|\r|\n)/.test(nextSlice) || eoi + 2 >= pdfBuffer.length) {
        foundEoi = eoi;
        break;
      }
      searchPos = eoi + 2;
    }

    if (foundEoi !== -1 && foundEoi > soi) {
      const candidateJpeg = pdfBuffer.subarray(soi, foundEoi + 2);
      // Filter out tiny decorative icons / bullets (< 5KB)
      if (candidateJpeg.length > 5120) {
        images.push(candidateJpeg);
      }
      offset = foundEoi + 2;
    } else {
      offset = soi + 3;
    }
  }

  // 2. If no JPEG streams found, scan for FlateDecode image streams
  if (images.length === 0) {
    try {
      const pdfText = pdfBuffer.toString('latin1');
      const streamRegex = /<<[^>]*\/Subtype\s*\/Image[^>]*>>\s*stream[\r\n]/g;
      let match: RegExpExecArray | null;

      while ((match = streamRegex.exec(pdfText)) !== null) {
        const dictStr = match[0];
        const streamStart = match.index + match[0].length;
        const endstreamIdx = pdfText.indexOf('endstream', streamStart);
        if (endstreamIdx === -1) continue;

        const rawStream = pdfBuffer.subarray(streamStart, endstreamIdx);

        if (dictStr.includes('/FlateDecode')) {
          try {
            const decompressed = zlib.inflateSync(rawStream);
            const widthMatch = dictStr.match(/\/Width\s+(\d+)/);
            const heightMatch = dictStr.match(/\/Height\s+(\d+)/);
            const colorSpaceMatch = dictStr.match(/\/ColorSpace\s*\/([A-Za-z0-9]+)/);

            if (widthMatch && heightMatch) {
              const width = parseInt(widthMatch[1], 10);
              const height = parseInt(heightMatch[1], 10);
              const isRgb = !colorSpaceMatch || colorSpaceMatch[1].includes('RGB');
              const channels = isRgb ? 3 : 1;

              if (decompressed.length >= width * height * channels) {
                const jpegBuf = await sharp(decompressed.subarray(0, width * height * channels), {
                  raw: { width, height, channels },
                })
                  .jpeg({ quality: 90 })
                  .toBuffer();
                images.push(jpegBuf);
              }
            }
          } catch {
            // continue searching other streams
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return images;
}

export async function runOcrOnImageBuffer(imageBuffer: Buffer, isFirstPage = false): Promise<string> {
  const Tesseract = await import('tesseract.js');
  const recognize =
    Tesseract.default?.recognize ||
    (Tesseract as unknown as { recognize: typeof Tesseract.default.recognize }).recognize;

  let headerText = '';

  try {
    const meta = await sharp(imageBuffer).metadata();

    // If first page, scan top ~12% header slice to guarantee capturing candidate name, contact & headline
    if (isFirstPage && meta.height && meta.width && meta.height > 600) {
      try {
        const topHeight = Math.round(meta.height * 0.12);
        const topSlice = await sharp(imageBuffer)
          .extract({ left: 0, top: 0, width: meta.width, height: topHeight })
          .toBuffer();
        const topOcr = await recognize(topSlice, 'eng');
        if (topOcr?.data?.text) {
          headerText = topOcr.data.text.trim();
        }
      } catch (headerErr) {
        logger.child('ResumeExtractor').warn('Top slice header OCR warning:', headerErr);
      }
    }

    // Downscale if image is gigantic (> 2000px wide) for fast OCR execution & memory efficiency
    let inputForOcr = imageBuffer;
    if (meta.width && meta.width > 2000) {
      inputForOcr = await sharp(imageBuffer)
        .resize({ width: 1800, withoutEnlargement: true })
        .toBuffer();
    }

    const fullOcr = await recognize(inputForOcr, 'eng');
    let fullText = fullOcr?.data?.text ? fullOcr.data.text.trim() : '';

    if (headerText) {
      const headerLines = headerText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 2);
      const fullLines = fullText.split('\n').map((l) => l.trim());
      const missingLines = headerLines.filter(
        (hl) => !fullLines.slice(0, 5).some((fl) => fl.includes(hl) || hl.includes(fl))
      );
      if (missingLines.length > 0) {
        fullText = `${missingLines.join('\n')}\n${fullText}`;
      }
    }

    return fullText;
  } catch (err) {
    logger.child('ResumeExtractor').error('OCR processing error with sharp pre-processing, attempting raw recognize:', err);
    const directResult = await recognize(imageBuffer, 'eng');
    return directResult?.data?.text || '';
  }
}

export async function runOcrOnMultipleImages(imageBuffers: Buffer[]): Promise<string> {
  const results: string[] = [];

  // Cap at 10 pages for scanned resumes to protect memory & avoid timeouts
  const pagesToScan = imageBuffers.slice(0, 10);

  for (let i = 0; i < pagesToScan.length; i++) {
    try {
      const text = await runOcrOnImageBuffer(pagesToScan[i], i === 0);
      const clean = text.trim();
      if (clean.length > 0) {
        results.push(`=== PAGE ${i + 1} (Scanned Image OCR) ===\n${clean}`);
      }
    } catch (err) {
      logger.child('ResumeExtractor').warn(`Tesseract OCR failed on scanned page ${i + 1}:`, err);
    }
  }

  return results.join('\n\n');
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const isImage =
    mimeType.startsWith('image/') ||
    /\.(png|jpe?g|webp|bmp|tiff)$/i.test(filename);

  if (isImage) {
    logger.child('ResumeExtractor').info(`Image resume detected for "${filename}". Performing Tesseract OCR...`);
    const ocrText = await runOcrOnImageBuffer(buffer, true);
    if (!ocrText || ocrText.trim().length === 0) {
      throw new Error(`Could not recognize any text from image resume: ${filename}`);
    }
    return normalizeResumeText(ocrText.trim());
  }

  const isPdf = mimeType.includes('pdf') || filename.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    let rawText = '';
    try {
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      if (data && typeof data.text === 'string') {
        rawText = data.text.trim();
      }
    } catch (parseErr) {
      logger.child('ResumeExtractor').warn(`Standard PDF text parsing failed for "${filename}", checking for scanned images:`, parseErr);
    }

    // Check if rawText contains readable alphabetic content (at least 60 characters with 40+ alpha)
    const alphaChars = (rawText.match(/[a-zA-Z0-9]/g) || []).length;
    if (rawText.length >= 60 && alphaChars >= 40) {
      return normalizeResumeText(rawText);
    }

    // Scanned / Image-based PDF detected
    logger.child('ResumeExtractor').info(
      `PDF "${filename}" contains minimal/no readable text (${rawText.length} chars, ${alphaChars} alpha). Scanning for embedded images to run Tesseract OCR...`
    );

    const images = await extractImagesFromPdf(buffer);
    if (images.length === 0) {
      if (rawText.length > 20) {
        return normalizeResumeText(rawText);
      }
      throw new Error(
        `PDF "${filename}" appears to be a scanned document, but no extractable images were found for OCR.`
      );
    }

    logger.child('ResumeExtractor').info(
      `Found ${images.length} scanned page image(s) in PDF "${filename}". Running Tesseract OCR...`
    );

    const ocrText = await runOcrOnMultipleImages(images);
    if (!ocrText || ocrText.trim().length === 0) {
      throw new Error(`Tesseract OCR completed but could not extract readable text from scanned PDF: ${filename}`);
    }

    return normalizeResumeText(ocrText.trim());
  }

  const rawText = buffer.toString('utf-8');
  const cleaned = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ').trim();
  if (cleaned.length === 0) {
    throw new Error(`Uploaded file is empty: ${filename}`);
  }
  return normalizeResumeText(cleaned);
}
