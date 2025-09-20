import { pdf } from "@react-pdf/renderer";

export const downloadPdfDocument = async (documentElement, fileName) => {
  if (!documentElement) {
    console.warn("No PDF document element provided for download");
    return;
  }

  try {
    const blob = await pdf(documentElement).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || `report_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to generate PDF document", error);
  }
};
