type TextFileDownload = {
  contents: string;
  fileName: string;
  mimeType?: string;
};

export function downloadTextFile({
  contents,
  fileName,
  mimeType = "text/plain;charset=utf-8",
}: TextFileDownload) {
  const blob = new Blob([contents], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = fileName;
  link.href = objectUrl;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
