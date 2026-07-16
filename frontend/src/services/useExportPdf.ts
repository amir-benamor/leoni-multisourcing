// src/services/useExportPdf.ts
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export function useExportPdf() {
  const exportToPdf = async (elementId: string, filename: string = 'export.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`❌ [Export PDF] Element #${elementId} not found`);
      return;
    }

    try {
      console.log(`📸 [Export PDF] Capturing #${elementId}...`);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      let heightLeft = imgHeight;
      let position = 0;

      while (heightLeft > 297) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      pdf.save(filename);
      console.log(`✅ [Export PDF] Saved: ${filename}`);
    } catch (error) {
      console.error('❌ [Export PDF] Failed:', error);
    }
  };

  return { exportToPdf };
}