import { WORDS } from '@/constants/words';

export const generateText = (wordCount: number = 100): string => {
  const selectedWords = [];
  for (let i = 0; i < wordCount; i++) {
    selectedWords.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
  }
  return selectedWords.join(' ');
};

export const getLines = (txt: string, max: number) => {
  const words = txt.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const space = currentLine ? ' ' : '';
    const testLine = currentLine + space + word;
    if (testLine.length > max) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        lines.push(word);
        currentLine = '';
      }
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
};
