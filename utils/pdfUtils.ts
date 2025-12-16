// Helper utility to convert PDF pages to images
// Using global window.pdfjsLib loaded from index.html

export const convertPdfToImages = async (pdfFile: File): Promise<File[]> => {
  // @ts-ignore
  const pdfjsLib = window.pdfjsLib;
  
  if (!pdfjsLib) {
    throw new Error("PDF Library not loaded. Please refresh the page.");
  }

  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: File[] = [];

    // Limit to first 10 pages to prevent browser crash on huge files
    const maxPages = Math.min(pdf.numPages, 10); 

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // Scale 2.0 for better quality analysis
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (!context) continue;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      const blob = await new Promise<Blob | null>((resolve) => 
        canvas.toBlob(resolve, 'image/jpeg', 0.95)
      );

      if (blob) {
        // Create a new File object
        const fileName = `${pdfFile.name.replace('.pdf', '')}_page_${i}.jpg`;
        const imageFile = new File([blob], fileName, { type: 'image/jpeg' });
        images.push(imageFile);
      }
    }

    return images;
  } catch (error) {
    console.error("PDF Conversion Error:", error);
    throw new Error("Gagal memproses file PDF. Pastikan file tidak rusak/terpassword.");
  }
};