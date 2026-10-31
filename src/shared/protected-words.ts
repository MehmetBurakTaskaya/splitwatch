// The names of the multi-sport Games' organizers and their events stay out of the project, in every
// language (CONTRIBUTING.md). They are assembled from letters here so that this file does not hold
// them; checks look for them in lower case.
export const PROTECTED_WORDS = [
  ['o', 'l', 'y', 'm', 'p'],
  ['o', 'l', 'i', 'm', 'p'],
  ['o', 'l', 'í', 'm', 'p'],
  ['о', 'л', 'и', 'м', 'п'],
  ['أ', 'و', 'ل', 'م', 'ب'],
  ['ا', 'و', 'ل', 'م', 'ب'],
  ['オ', 'リ', 'ン', 'ピ', 'ッ', 'ク'],
  ['五', '輪'],
  ['奥', '运'],
  ['奧', '運'],
  ['奥', '林', '匹', '克'],
  ['올', '림', '픽'],
].map((letters) => letters.join(''));
