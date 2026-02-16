import convertPathToPdf from "../../../../utils/convertToPdf";

const generarPDFManifiesto = async (req, res) => {
    try {
        const { archivoUrlDocx } = req.body;

        if (!archivoUrlDocx) {
            return res.status(400).json({ error: "URL del documento no proporcionada" });
        }

        const convert = convertPathToPdf(archivoUrlDocx);

        if (!convert) {
            return res.status(500).json({ error: "Error al convertir el documento a PDF" });
        }
        console.log("PDF generado correctamente");
        res.setHeader("Content-Type", "application/pdf");
        res.send(convert);
    } catch (error) {
        console.error("Error generando PDF:", error);
        res.status(500).json({ error: "Error al generar el PDF" });
    }
};

export default generarPDFManifiesto;