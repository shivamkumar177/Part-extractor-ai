import * as pdfjs from 'pdfjs-dist';

(pdfjs as any).GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function pdfToImages(file: File): Promise<{ data: string; mimeType: string }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (pdfjs as any).getDocument({ data: arrayBuffer }).promise;
  
  const images: { data: string; mimeType: string }[] = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const context = canvas.getContext('2d');
    if (!context) continue;
    
    await page.render({ canvasContext: context, viewport }).promise;
    
    const dataUrl = canvas.toDataURL('image/png');
    images.push({ data: dataUrl, mimeType: 'image/png' });
  }
  
  return images;
}