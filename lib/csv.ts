import Papa from 'papaparse';

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  rawText: string;
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    file
      .text()
      .then((rawText) => {
        Papa.parse<Record<string, string>>(rawText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim(),
          complete: (results) => {
            if (results.errors.length && results.data.length === 0) {
              reject(new Error(results.errors[0].message));
              return;
            }
            const headers = results.meta.fields ?? [];
            resolve({ headers, rows: results.data, rawText });
          },
          error: (err: Error) => reject(err),
        });
      })
      .catch(reject);
  });
}

export function recordsToCsv(records: Record<string, string>[]): string {
  return Papa.unparse(records);
}
