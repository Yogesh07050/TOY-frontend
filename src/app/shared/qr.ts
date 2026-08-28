/**
 * A QR encoder, byte mode, error-correction level M.
 *
 * Written rather than installed because this app ships no third-party runtime
 * dependencies at all — the same reason the backend hand-rolls its XLSX writer.
 * A claim code needs one small square of black and white; that is not worth a
 * package, a licence and a supply chain.
 *
 * Level M (about 15% recovery) rather than L: this gets scanned off a phone
 * screen held at an angle under a shop light, with a fingerprint across it.
 *
 * Versions 1–20 are enough for any claim URL we produce — version 20 holds 565
 * bytes, and the longest link is under 200.
 */

// ---------------------------------------------------------------------------
// GF(256), the field Reed–Solomon works in
// ---------------------------------------------------------------------------

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    // x *= 2 in GF(256), reducing by the QR primitive polynomial 0x11D.
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();

const mul = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/** The generator polynomial for `degree` error-correction codewords. */
function generatorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= mul(poly[j], 1);
      next[j + 1] ^= mul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** Polynomial long division; the remainder is the EC codewords. */
function errorCorrection(data: number[], ecCount: number): number[] {
  const generator = generatorPoly(ecCount);
  const remainder = new Array<number>(ecCount).fill(0);

  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    for (let i = 0; i < ecCount; i += 1) {
      remainder[i] ^= mul(generator[i + 1], factor);
    }
  }
  return remainder;
}

// ---------------------------------------------------------------------------
// Version tables (level M only)
// ---------------------------------------------------------------------------

/** [ecPerBlock, group1Blocks, group1Data, group2Blocks, group2Data] by version. */
const EC_TABLE_M: readonly (readonly number[])[] = [
  [10, 1, 16, 0, 0], // 1
  [16, 1, 28, 0, 0],
  [26, 1, 44, 0, 0],
  [18, 2, 32, 0, 0],
  [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0],
  [18, 4, 31, 0, 0],
  [22, 2, 38, 2, 39],
  [22, 3, 36, 2, 37],
  [26, 4, 43, 1, 44], // 10
  [30, 1, 50, 4, 51],
  [22, 6, 36, 2, 37],
  [22, 8, 37, 1, 38],
  [24, 4, 40, 5, 41],
  [24, 5, 41, 5, 42],
  [28, 7, 45, 3, 46],
  [28, 10, 46, 1, 47],
  [26, 9, 43, 4, 44],
  [26, 3, 44, 11, 45],
  [26, 3, 41, 13, 42], // 20
];

/** Centres of the alignment patterns, by version. */
const ALIGNMENT: readonly (readonly number[])[] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
];

/** The 18-bit BCH version block, for versions 7 and up. */
const VERSION_BITS: Record<number, number> = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
  11: 0x0bbf6,
  12: 0x0c762,
  13: 0x0d847,
  14: 0x0e60d,
  15: 0x0f928,
  16: 0x10b78,
  17: 0x1145d,
  18: 0x12a17,
  19: 0x13532,
  20: 0x149a6,
};

/** The 15-bit format block for level M, indexed by mask. */
const FORMAT_BITS_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];

/**
 * Data codewords available at this version. The remainder bits the standard
 * lists after the last codeword need no handling here: `placeData` writes a
 * zero into every module the stream does not reach, which is what they are.
 */
function dataCapacity(version: number): number {
  const [, g1Blocks, g1Data, g2Blocks, g2Data] = EC_TABLE_M[version - 1];
  return g1Blocks * g1Data + g2Blocks * g2Data;
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

class BitBuffer {
  readonly bits: number[] = [];

  put(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i -= 1) this.bits.push((value >>> i) & 1);
  }

  get length(): number {
    return this.bits.length;
  }
}

/** Byte-mode character-count indicator width. */
const countBits = (version: number): number => (version <= 9 ? 8 : 16);

function buildCodewords(bytes: Uint8Array, version: number): number[] {
  const capacity = dataCapacity(version);
  const buffer = new BitBuffer();

  buffer.put(0b0100, 4); // byte mode
  buffer.put(bytes.length, countBits(version));
  for (const byte of bytes) buffer.put(byte, 8);

  // Terminator: up to four zero bits, fewer if the buffer is nearly full.
  const totalBits = capacity * 8;
  buffer.put(0, Math.min(4, totalBits - buffer.length));
  // Pad to a byte boundary.
  while (buffer.length % 8 !== 0) buffer.bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < buffer.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | buffer.bits[i + j];
    codewords.push(byte);
  }
  // Alternating pad bytes, as the standard specifies, until the block is full.
  const PAD = [0xec, 0x11];
  for (let i = 0; codewords.length < capacity; i += 1) codewords.push(PAD[i % 2]);
  return codewords;
}

/**
 * Splits the data into blocks, appends each block's EC codewords, then
 * interleaves both — which is what lets the reader lose a whole contiguous
 * smudge of the symbol and still recover every block.
 */
function interleave(codewords: number[], version: number): number[] {
  const [ecCount, g1Blocks, g1Data, g2Blocks, g2Data] = EC_TABLE_M[version - 1];

  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;

  for (let i = 0; i < g1Blocks + g2Blocks; i += 1) {
    const size = i < g1Blocks ? g1Data : g2Data;
    const block = codewords.slice(offset, offset + size);
    offset += size;
    dataBlocks.push(block);
    ecBlocks.push(errorCorrection(block, ecCount));
  }

  const result: number[] = [];
  const maxData = Math.max(g1Data, g2Data);
  for (let i = 0; i < maxData; i += 1) {
    for (const block of dataBlocks) if (i < block.length) result.push(block[i]);
  }
  for (let i = 0; i < ecCount; i += 1) {
    for (const block of ecBlocks) result.push(block[i]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Matrix
// ---------------------------------------------------------------------------

type Grid = (0 | 1 | null)[][];

/** Lays down everything that is not data: finders, timing, alignment, reserves. */
function functionPatterns(version: number): { grid: Grid; reserved: boolean[][] } {
  const size = version * 4 + 17;
  const grid: Grid = Array.from({ length: size }, () => new Array(size).fill(null));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

  const set = (row: number, col: number, value: 0 | 1) => {
    grid[row][col] = value;
    reserved[row][col] = true;
  };

  // Three finder patterns, each with its white separator.
  for (const [baseRow, baseCol] of [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ]) {
    for (let r = -1; r <= 7; r += 1) {
      for (let c = -1; c <= 7; c += 1) {
        const row = baseRow + r;
        const col = baseCol + c;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        const onRing = (r === 0 || r === 6) && c >= 0 && c <= 6;
        const onSide = (c === 0 || c === 6) && r >= 0 && r <= 6;
        const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        set(row, col, onRing || onSide || inCore ? 1 : 0);
      }
    }
  }

  // Timing patterns: the alternating row and column that fix the module pitch.
  for (let i = 8; i < size - 8; i += 1) {
    const value = i % 2 === 0 ? 1 : 0;
    set(6, i, value);
    set(i, 6, value);
  }

  // Alignment patterns, skipping the three corners the finders already own.
  const centres = ALIGNMENT[version - 1];
  for (const row of centres) {
    for (const col of centres) {
      const nearFinder =
        (row <= 8 && col <= 8) || (row <= 8 && col >= size - 9) || (row >= size - 9 && col <= 8);
      if (nearFinder) continue;
      for (let r = -2; r <= 2; r += 1) {
        for (let c = -2; c <= 2; c += 1) {
          const ring = Math.max(Math.abs(r), Math.abs(c));
          set(row + r, col + c, ring === 1 ? 0 : 1);
        }
      }
    }
  }

  // The dark module, which is always set.
  set(size - 8, 8, 1);

  // Reserve the format areas; the real bits are written after masking.
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
  }
  // The second, split copy: eight modules along row 8 on the right, and seven
  // up column 8 from the bottom, plus the dark module that caps that column.
  // Both runs are eight cells wide; getting either off by one silently shifts
  // every data module after it and corrupts the whole symbol.
  for (let i = 0; i < 8; i += 1) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }

  // And the version areas, for versions 7 and up.
  if (version >= 7) {
    for (let i = 0; i < 18; i += 1) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      reserved[row][size - 11 + col] = true;
      reserved[size - 11 + col][row] = true;
    }
  }

  return { grid, reserved };
}

/** Walks the two-module-wide zigzag from the bottom right, skipping column 6. */
function placeData(grid: Grid, reserved: boolean[][], data: number[]): void {
  const size = grid.length;
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5; // the vertical timing column is not data
    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;
      for (const col of [right, right - 1]) {
        if (reserved[row][col]) continue;
        const byte = data[bitIndex >>> 3];
        const bit = byte === undefined ? 0 : (byte >>> (7 - (bitIndex & 7))) & 1;
        grid[row][col] = bit as 0 | 1;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
}

const MASKS: ((row: number, col: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/**
 * The four penalty rules from the standard. Lower is better; the encoder tries
 * all eight masks and keeps the least offensive, which is what stops a symbol
 * from growing large blank areas a scanner would mistake for a finder.
 */
function penalty(grid: Grid): number {
  const size = grid.length;
  const at = (r: number, c: number) => grid[r][c] === 1;
  let score = 0;

  // Rule 1: runs of five or more same-coloured modules, in both directions.
  for (let i = 0; i < size; i += 1) {
    for (const horizontal of [true, false]) {
      let run = 1;
      for (let j = 1; j < size; j += 1) {
        const prev = horizontal ? at(i, j - 1) : at(j - 1, i);
        const cur = horizontal ? at(i, j) : at(j, i);
        if (cur === prev) {
          run += 1;
        } else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
      if (run >= 5) score += run - 2;
    }
  }

  // Rule 2: every 2x2 block of one colour.
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const v = at(r, c);
      if (v === at(r, c + 1) && v === at(r + 1, c) && v === at(r + 1, c + 1)) score += 3;
    }
  }

  // Rule 3: the 1:1:3:1:1 finder-like sequence with four light modules beside it.
  const PATTERN = [true, false, true, true, true, false, true];
  const matches = (line: boolean[], start: number): boolean => {
    for (let i = 0; i < 7; i += 1) if (line[start + i] !== PATTERN[i]) return false;
    const before = line.slice(Math.max(0, start - 4), start);
    const after = line.slice(start + 7, start + 11);
    const quiet = (part: boolean[]) => part.length === 4 && part.every((v) => !v);
    return quiet(before) || quiet(after);
  };
  for (let i = 0; i < size; i += 1) {
    const row: boolean[] = [];
    const col: boolean[] = [];
    for (let j = 0; j < size; j += 1) {
      row.push(at(i, j));
      col.push(at(j, i));
    }
    for (let j = 0; j + 7 <= size; j += 1) {
      if (matches(row, j)) score += 40;
      if (matches(col, j)) score += 40;
    }
  }

  // Rule 4: how far the dark/light balance strays from half and half.
  let dark = 0;
  for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) if (at(r, c)) dark += 1;
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

function writeFormat(grid: Grid, mask: number): void {
  const size = grid.length;
  const bits = FORMAT_BITS_M[mask];
  const bit = (i: number): 0 | 1 => ((bits >>> i) & 1) as 0 | 1;

  // The copy that wraps the top-left finder: up column 8 from the top, then
  // left to right along row 8. The corner module (8, 8) carries bit 7, and
  // row 6 / column 6 are skipped because the timing patterns own them.
  for (let i = 0; i <= 5; i += 1) grid[i][8] = bit(i);
  grid[7][8] = bit(6);
  grid[8][8] = bit(7);
  grid[8][7] = bit(8);
  for (let i = 9; i <= 14; i += 1) grid[8][14 - i] = bit(i);

  // The redundant copy, split between the other two finders: bits 0-7 run
  // leftwards along row 8 from the right edge, bits 8-14 run down column 8 to
  // the bottom edge.
  for (let i = 0; i <= 7; i += 1) grid[8][size - 1 - i] = bit(i);
  for (let i = 8; i <= 14; i += 1) grid[size - 15 + i][8] = bit(i);

  // The dark module. Always set, in every symbol ever made.
  grid[size - 8][8] = 1;
}

function writeVersion(grid: Grid, version: number): void {
  if (version < 7) return;
  const size = grid.length;
  const bits = VERSION_BITS[version];
  for (let i = 0; i < 18; i += 1) {
    const value = ((bits >>> i) & 1) as 0 | 1;
    const row = Math.floor(i / 3);
    const col = i % 3;
    grid[row][size - 11 + col] = value;
    grid[size - 11 + col][row] = value;
  }
}

/**
 * Encodes `text` and returns the symbol as rows of booleans, true meaning dark.
 * No quiet zone — the caller adds that as padding, which is cheaper than
 * carrying four blank modules through every render.
 */
export function encodeQr(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);

  let version = 0;
  for (let candidate = 1; candidate <= EC_TABLE_M.length; candidate += 1) {
    const bitsNeeded = 4 + countBits(candidate) + bytes.length * 8;
    if (bitsNeeded <= dataCapacity(candidate) * 8) {
      version = candidate;
      break;
    }
  }
  if (!version) throw new Error('Too much data for a QR code of this size');

  const codewords = interleave(buildCodewords(bytes, version), version);
  const { grid, reserved } = functionPatterns(version);
  placeData(grid, reserved, codewords);

  // Try every mask and keep the one the standard's penalty rules like best.
  let best: { mask: number; grid: Grid; score: number } | null = null;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate: Grid = grid.map((row) => [...row]);
    for (let r = 0; r < candidate.length; r += 1) {
      for (let c = 0; c < candidate.length; c += 1) {
        if (reserved[r][c]) continue;
        if (MASKS[mask](r, c)) candidate[r][c] = (candidate[r][c] === 1 ? 0 : 1) as 0 | 1;
      }
    }
    writeFormat(candidate, mask);
    writeVersion(candidate, version);
    const score = penalty(candidate);
    if (!best || score < best.score) best = { mask, grid: candidate, score };
  }

  return best!.grid.map((row) => row.map((cell) => cell === 1));
}

/**
 * Renders an encoded symbol as an SVG path string plus the viewBox size.
 *
 * One `<path>` of many subpaths rather than a rect per module: a version-10
 * symbol has 3,481 modules, and 3,481 DOM nodes is a visibly slow render on
 * the mid-range phone this is mostly viewed on.
 */
export function qrToSvgPath(matrix: boolean[][], quietZone = 2): { path: string; size: number } {
  const size = matrix.length + quietZone * 2;
  const parts: string[] = [];

  for (let r = 0; r < matrix.length; r += 1) {
    for (let c = 0; c < matrix.length; c += 1) {
      if (matrix[r][c]) parts.push(`M${c + quietZone} ${r + quietZone}h1v1h-1z`);
    }
  }
  return { path: parts.join(''), size };
}
