// Extracts out the filename from a filepath
// "img/tower/enemy_freezypup.png" -> "enemy_freezypup"
export function extractFilename(filePath: string): string {
  const lastSlash = filePath.lastIndexOf("/");
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1 || lastDot < lastSlash) return "";

  return filePath.substring(lastSlash + 1, lastDot);
}

// Extract a chunk of text from in between two markers
export function getTextBetween(
  source: string,
  startWord: string,
  endWord: string,
): string | null {
  const startIndex = source.indexOf(startWord);
  if (startIndex === -1) return null; // Start word not found

  const endIndex = source.indexOf(endWord, startIndex + startWord.length);
  if (endIndex === -1) return null; // End word not found

  // Calculate the actual content boundaries
  const resultStart = startIndex + startWord.length;

  return source.slice(resultStart, endIndex).trim();
}

// LEGACY Remove later
(globalThis as any).DogTracker.helpers = {
  extractFilename,
  getTextBetween,
};
