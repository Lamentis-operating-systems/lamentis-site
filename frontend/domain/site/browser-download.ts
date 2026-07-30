type TextFileDownload = {
  contents: string;
  fileName: string;
  mimeType?: string;
};

export type TextFileDownloadResult = "downloaded" | "failed";

export function downloadTextFile({
  contents,
  fileName,
  mimeType = "text/plain;charset=utf-8",
}: TextFileDownload): TextFileDownloadResult {
  let link: HTMLAnchorElement | null = null;
  let objectUrl: string | null = null;

  try {
    const blob = new Blob([contents], { type: mimeType });
    objectUrl = URL.createObjectURL(blob);
    link = document.createElement("a");
    link.download = fileName;
    link.href = objectUrl;
    link.hidden = true;
    document.body.append(link);
    link.click();
    return "downloaded";
  } catch {
    return "failed";
  } finally {
    link?.remove();

    if (objectUrl) {
      const urlToRevoke = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(urlToRevoke), 0);
    }
  }
}
