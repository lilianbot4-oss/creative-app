"use client";

import JSZip from "jszip";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const decodeXml = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#13;/g, "\n");

export async function extractTextFromPdf(file: File) {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const pageCount = pdf.numPages;
  const pages: string[] = [];

  for (let i = 1; i <= pageCount; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    pages.push(`Page ${i}\n${pageText}`);
  }

  return {
    text: pages.join("\n\n"),
    meta: { pages: pageCount },
  };
}

export async function extractTextFromPptx(file: File) {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"))
    .sort((a, b) => {
      const aNum = Number(a.match(/slide(\d+)\.xml/)?.[1] ?? 0);
      const bNum = Number(b.match(/slide(\d+)\.xml/)?.[1] ?? 0);
      return aNum - bNum;
    });

  const slides: string[] = [];
  for (const slidePath of slideFiles) {
    const xml = await zip.file(slidePath)?.async("string");
    if (!xml) continue;
    const matches = Array.from(xml.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/g));
    const text = matches.map((match) => decodeXml(match[1] ?? "")).join(" ");
    const slideNumber = slidePath.match(/slide(\d+)\.xml/)?.[1] ?? "";
    slides.push(`Slide ${slideNumber}\n${text}`);
  }

  return {
    text: slides.join("\n\n"),
    meta: { slides: slideFiles.length },
  };
}
