export const LETTERS = ['A', 'B', 'C', 'D', 'E'];
export const isOrder = order => Array.isArray(order) && order.length === 5 && new Set(order).size === 5 && order.every(x => LETTERS.includes(x));

export function shuffleOrder(previous, answer, random = Math.random) {
  const order = [...LETTERS];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Retrying a pair always moves its answer to another displayed position.
  if (isOrder(previous) && order.indexOf(answer) === previous.indexOf(answer)) {
    const from = order.indexOf(answer);
    const to = (from + 1 + Math.floor(random() * 4)) % 5;
    [order[from], order[to]] = [order[to], order[from]];
  }
  return order;
}

// Only explicitly annotated choice references are relabelled. Medical letters
// (vitamin A, hemophilia B, blood group A) remain byte-for-byte unchanged.
export function relabelReferences(text, references = [], order) {
  let result = '', cursor = 0;
  for (const ref of references) {
    result += text.slice(cursor, ref.start);
    result += ref.letters.map(letter => LETTERS[order.indexOf(letter)]).join('/');
    cursor = ref.end;
  }
  return result + text.slice(cursor);
}
