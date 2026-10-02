const convertToPdf = require("../../../../utils/convertToPdf");
const { generarWordBoleta } = require("./documentoBoleta");

const generarPdfBoleta = async (req, res) => {
  try {
    const { wordBuffer, nombre } = await generarWordBoleta(req.params.id);
    const pdfBuffer = await convertToPdf(wordBuffer);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nombre.replace(/\.docx$/i, ".pdf")}"`, "Content-Length": pdfBuffer.length, "Cache-Control": "no-store" });
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Error al generar PDF de boleta:", error);
    return res.status(error.status || 500).json({ message: error.message || "No se pudo generar la vista previa de la boleta" });
  }
};

module.exports = generarPdfBoleta;
