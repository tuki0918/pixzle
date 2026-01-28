import { shuffle } from "@tuki0918/seeded-shuffle";

export function createPermutation(
  length: number,
  seed: number | string,
): number[] {
  if (length <= 0) return [];
  const indices = Array.from({ length }, (_, i) => i);
  return shuffle(indices, seed);
}

export function invertPermutation(permutation: number[]): number[] {
  const inverse = new Array<number>(permutation.length);
  for (let i = 0; i < permutation.length; i++) {
    inverse[permutation[i]] = i;
  }
  return inverse;
}

export function buildCumulativeCounts(counts: number[]): number[] {
  const ends: number[] = [];
  let sum = 0;
  for (const count of counts) {
    sum += count;
    ends.push(sum);
  }
  return ends;
}

export function findIndexInCumulative(
  cumulativeEnds: number[],
  counts: number[],
  index: number,
): { rangeIndex: number; localIndex: number } {
  let low = 0;
  let high = cumulativeEnds.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (index < cumulativeEnds[mid]) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  const start = cumulativeEnds[low] - counts[low];
  return { rangeIndex: low, localIndex: index - start };
}
