import { extractText } from "unpdf";

export async function extractTextFromPdf(data: Buffer): Promise<string> {
  const uint8 = new Uint8Array(data);
  const result = await extractText(uint8, { mergePages: true });
  return result.text;
}
