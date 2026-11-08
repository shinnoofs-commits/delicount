import JSZip from 'jszip';

export function exportToCsv(filename: string, rows: any[]) {
  if (!rows || !rows.length) {
    return;
  }

  // Extract headers
  const headers = Object.keys(rows[0]);
  
  // Format rows
  const csvContent = [
    headers.join(','), // Header row
    ...rows.map(row => 
      headers.map(header => {
        const cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        // Escape quotes and wrap in quotes if it contains comma, newline or quotes
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    )
  ].join('\n');

  // Add BOM for Excel compatibility (UTF-8)
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link and trigger
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export function generateCsvContent(rows: any[]): string {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.join(','),
    ...rows.map(row => 
      headers.map(header => {
        const cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    )
  ].join('\n');
}

export async function exportMultipleCsvsAsZip(zipFilename: string, files: {name: string, rows: any[]}[]) {
  const zip = new JSZip();
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);

  for (const file of files) {
    if (!file.rows || !file.rows.length) continue;
    const csvContent = generateCsvContent(file.rows);
    // Combine BOM and CSV content into a single Blob, then get its ArrayBuffer
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const arrayBuffer = await blob.arrayBuffer();
    zip.file(file.name, arrayBuffer);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(content);
    link.setAttribute('href', url);
    link.setAttribute('download', zipFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
