function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export function downloadBinary(
  bytes: Uint8Array<ArrayBuffer>,
  filename: string,
): void {
  const blob = new Blob([bytes], { type: "application/octet-stream" });

  download(blob, filename);
}
