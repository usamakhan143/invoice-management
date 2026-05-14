/**
 * Streaming CSV reader for big files in the browser.
 *
 * Why: importing 50k+ leads can crash a tab if we read the whole file as one
 * string and parse it synchronously. Instead we slice the `File` blob into
 * fixed chunks, decode incrementally with a streaming `TextDecoder`, and
 * tokenise row-by-row while tracking quote state across chunk boundaries.
 *
 * Output is delivered in row-batches via the `onRows` callback so callers
 * can update progress / yield to the main thread between batches.
 *
 * Format details (RFC 4180-ish):
 *  - Quoted fields support commas, newlines, and escaped `""`.
 *  - Mixed line endings (LF / CRLF / CR) are all treated as row terminators.
 *  - UTF-8 BOM at start of file is stripped from the first header cell.
 *  - Empty rows (all-empty cells) are dropped so trailing blank lines do
 *    not pollute counters.
 *  - Cell whitespace is NOT trimmed; callers decide.
 *
 * Chunk-boundary safety: we hold back the LAST decoded character between
 * chunks. That covers the two lookahead cases:
 *   1. `""` (escaped quote) split across chunks while inside quotes.
 *   2. `\r\n` (CRLF) split across chunks.
 */

export interface CsvStreamOptions {
  /** Bytes per Blob slice. Default ~2 MB (good balance: low memory, few yields). */
  chunkSize?: number;
  /** Field delimiter, default `,`. */
  delimiter?: string;
  /** Rows to deliver per callback invocation. Default 500. */
  batchRows?: number;
  /** Maximum data rows (excluding header) to read in total. 0 = unlimited. */
  maxRows?: number;
  /** Stop early signal — caller flips `signal.aborted = true`. */
  signal?: { aborted: boolean };
}

export interface CsvStreamResult {
  /** Header row (first non-empty row, BOM stripped). Empty if file had no rows. */
  header: string[];
  /** Total data rows actually delivered (after maxRows cap). */
  rowCount: number;
  /** True if `maxRows` cap stopped the stream early. */
  truncated: boolean;
  /** True if `signal.aborted` stopped the stream. */
  aborted: boolean;
}

const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB
const DEFAULT_BATCH_ROWS = 500;

/** Read a Blob slice as binary using FileReader (broad browser support). */
function readSliceAsArrayBuffer(slice: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error("CSV read failed"));
    reader.onload = () => {
      const r = reader.result;
      if (r instanceof ArrayBuffer) resolve(r);
      else reject(new Error("CSV reader returned non-binary result"));
    };
    reader.readAsArrayBuffer(slice);
  });
}

interface ParserState {
  inQuotes: boolean;
  field: string;
  row: string[];
  /** Single character held back across a non-final chunk for lookahead safety. */
  carry: string;
}

function newState(): ParserState {
  return { inQuotes: false, field: "", row: [], carry: "" };
}

/**
 * Feed one decoded chunk into the parser. Emits each completed row.
 * `isLast` controls whether we consume the final character (needed for
 * lookahead-sensitive cases like `""` escape and `\r\n`).
 */
function feedChunk(
  chunk: string,
  delimiter: string,
  state: ParserState,
  isLast: boolean,
  emit: (row: string[]) => void,
): void {
  const text = state.carry + chunk;
  state.carry = "";
  const total = text.length;
  // Hold back 1 char when more chunks are coming so lookahead is always safe.
  const limit = isLast ? total : Math.max(0, total - 1);
  let i = 0;

  while (i < limit) {
    const ch = text[i];

    if (state.inQuotes) {
      if (ch === '"') {
        // Look-ahead for "" escape (safe — `total` is full length, lookahead
        // index `i + 1` is < total because we held back the last char unless isLast).
        if (i + 1 < total && text[i + 1] === '"') {
          state.field += '"';
          i += 2;
          continue;
        }
        state.inQuotes = false;
        i += 1;
        continue;
      }
      state.field += ch;
      i += 1;
      continue;
    }

    // Outside quotes
    if (ch === '"' && state.field.length === 0) {
      state.inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === delimiter) {
      state.row.push(state.field);
      state.field = "";
      i += 1;
      continue;
    }

    if (ch === "\n" || ch === "\r") {
      state.row.push(state.field);
      state.field = "";
      const isBlank = state.row.length === 1 && state.row[0] === "";
      if (!isBlank) emit(state.row);
      state.row = [];
      // CRLF: collapse to single newline. Lookahead safe (see `limit` rules).
      if (ch === "\r" && i + 1 < total && text[i + 1] === "\n") i += 2;
      else i += 1;
      continue;
    }

    state.field += ch;
    i += 1;
  }

  // Tail handling: if we held back 1 char (because !isLast), put it on carry.
  if (i < total) state.carry = text.slice(i);
}

/** Final flush at end of stream (no trailing newline). */
function flush(state: ParserState, emit: (row: string[]) => void): void {
  // If we held back a carry char in the last `feedChunk`, fold it in by
  // running one more pass with isLast = true.
  if (state.carry.length > 0) {
    const tail = state.carry;
    state.carry = "";
    feedChunk(tail, ",", state, true, emit);
  }

  if (state.inQuotes) {
    // Unterminated quote — emit what we have so it appears in the error report.
    state.row.push(state.field);
    state.field = "";
    state.inQuotes = false;
    emit(state.row);
    state.row = [];
    return;
  }
  if (state.field.length > 0 || state.row.length > 0) {
    state.row.push(state.field);
    const isBlank = state.row.length === 1 && state.row[0] === "";
    if (!isBlank) emit(state.row);
    state.field = "";
    state.row = [];
  }
}

/** Strip a leading UTF-8 BOM from the first cell of the first row, if present. */
function stripBomFromHeader(row: string[]): string[] {
  if (row.length === 0) return row;
  const first = row[0];
  if (first.length === 0 || first.charCodeAt(0) !== 0xfeff) return row;
  return [first.slice(1), ...row.slice(1)];
}

/**
 * Stream-parse `file` and deliver rows in batches.
 *
 * @param onRows  Called per batch with a slice of data rows (header excluded).
 *                Returning a promise pauses the stream until it resolves —
 *                useful for back-pressure when the consumer is slow.
 * @param onProgress Optional: bytes processed / total bytes. Errors thrown
 *                inside the callback are swallowed so progress UI bugs do
 *                not break imports.
 */
export async function streamCsv(
  file: Blob,
  opts: CsvStreamOptions,
  onRows: (
    rows: string[][],
    context: { header: string[]; firstBatch: boolean },
  ) => void | Promise<void>,
  onProgress?: (bytesRead: number, totalBytes: number) => void,
): Promise<CsvStreamResult> {
  const chunkSize = Math.max(64 * 1024, opts.chunkSize ?? DEFAULT_CHUNK_SIZE);
  const delimiter = opts.delimiter ?? ",";
  const batchRows = Math.max(50, opts.batchRows ?? DEFAULT_BATCH_ROWS);
  const maxRows = opts.maxRows ?? 0;
  const signal = opts.signal;

  const totalBytes = file.size;
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const state = newState();

  let header: string[] | null = null;
  let pendingBatch: string[][] = [];
  let rowCount = 0;
  let truncated = false;
  let firstBatch = true;

  const flushBatch = async () => {
    if (pendingBatch.length === 0) return;
    const batch = pendingBatch;
    pendingBatch = [];
    await onRows(batch, { header: header ?? [], firstBatch });
    firstBatch = false;
  };

  const handleRow = (row: string[]) => {
    if (signal?.aborted || truncated) return;
    if (header === null) {
      header = stripBomFromHeader(row);
      return;
    }
    rowCount += 1;
    pendingBatch.push(row);
    if (maxRows > 0 && rowCount >= maxRows) {
      truncated = true;
    }
  };

  // Loop file slices.
  for (let offset = 0; offset < totalBytes; offset += chunkSize) {
    if (signal?.aborted) break;
    const end = Math.min(offset + chunkSize, totalBytes);
    const slice = file.slice(offset, end);
    const buf = await readSliceAsArrayBuffer(slice);
    const isLastSlice = end >= totalBytes;
    // TextDecoder stream mode: keep multi-byte UTF-8 sequences across boundaries.
    const text = decoder.decode(new Uint8Array(buf), { stream: !isLastSlice });
    feedChunk(text, delimiter, state, isLastSlice, handleRow);

    if (onProgress) {
      try {
        onProgress(end, totalBytes);
      } catch {
        /* progress callback errors must never break the stream */
      }
    }

    if (pendingBatch.length >= batchRows) {
      await flushBatch();
      // Yield to event loop so the UI can paint between batches.
      // eslint-disable-next-line no-await-in-loop
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    if (truncated) break;
  }

  if (!signal?.aborted && !truncated) {
    flush(state, handleRow);
  }
  await flushBatch();

  return {
    header: header ?? [],
    rowCount,
    truncated,
    aborted: !!signal?.aborted,
  };
}

/**
 * Detect delimiter from a small sample (`,`, `;`, or `\t`).
 * Picks the candidate with the highest median per-line count.
 */
export async function detectCsvDelimiter(file: Blob): Promise<string> {
  const sampleSize = Math.min(file.size, 64 * 1024);
  const buf = await readSliceAsArrayBuffer(file.slice(0, sampleSize));
  const text = new TextDecoder("utf-8", { fatal: false }).decode(
    new Uint8Array(buf),
  );
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.length > 0).slice(0, 10);
  if (lines.length === 0) return ",";
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestScore = -1;
  for (const d of candidates) {
    // Use the first line (header) as proxy: many headers, none likely quoted.
    const counts = lines.map((l) => l.split(d).length - 1);
    counts.sort((a, b) => a - b);
    const median = counts[Math.floor(counts.length / 2)];
    if (median > bestScore) {
      bestScore = median;
      best = d;
    }
  }
  return best;
}
