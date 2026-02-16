const convertPathToPdf = require("../../../../../utils/convertToPdf");


const returnPdf = async (req, res) => {
  console.log("📥 POST /api/returnPdf - Solicitud recibida");

  try {
    const { archivoUrlDocx } = req.body;

    console.log("URL recibida:", archivoUrlDocx);

    if (!archivoUrlDocx) {
      console.error("❌ No se proporcionó URL de archivo");
      return res.status(400).json({
        message: "URL de archivo no proporcionada",
        error: "MISSING_URL"
      });
    }

    // Validar que la URL sea de Cloudinary
    if (!archivoUrlDocx.includes('cloudinary.com')) {
      console.warn("⚠️ La URL no es de Cloudinary:", archivoUrlDocx);
    }

    console.log("🔄 Llamando a convertPathToPdf...");
    const pdfBuffer = await convertPathToPdf(archivoUrlDocx);

    console.log("✅ PDF generado correctamente. Tamaño:", pdfBuffer.length, "bytes");

    // Enviar PDF
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="manifiesto_${Date.now()}.pdf"`,
      "Content-Length": pdfBuffer.length
    });

    res.send(pdfBuffer);
    console.log("📤 PDF enviado al cliente");

  } catch (error) {
    console.error("❌ Error en returnPdf:", error.message);
    console.error("Stack completo:", error.stack);

    // Determinar tipo de error
    let statusCode = 500;
    let errorType = "INTERNAL_ERROR";

    if (error.message.includes("API key")) {
      statusCode = 500;
      errorType = "API_KEY_MISSING";
    } else if (error.message.includes("URL")) {
      statusCode = 400;
      errorType = "INVALID_URL";
    } else if (error.message.includes("timeout")) {
      statusCode = 504;
      errorType = "TIMEOUT";
    }

    res.status(statusCode).json({
      message: error.message,
      error: errorType,
      details: error.toString()
    });
  }
};

module.exports = returnPdf;