/**
 * Утилита для скачивания файлов в браузере.
 * Поддерживает как текстовые данные, так и бинарные данные из base64.
 */
export const downloadFile = (content: string, filename: string, mimeType: string, isBase64: boolean = false) => {
  let blob: Blob;

  if (isBase64) {
    const byteCharacters = atob(content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    blob = new Blob([byteArray], {type: mimeType});
  } else {
    blob = new Blob([content], {type: mimeType});
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);

  link.click();

  // Очистка после скачивания
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
