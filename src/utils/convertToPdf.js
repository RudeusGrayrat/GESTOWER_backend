const ILovePDFApi = require("@ilovepdf/ilovepdf-nodejs");
const { ILOVEPDF_PUBLIC_API_KEY, ILOVEPDF_SECRET_API_KEY } = process.env;

// Verificar que las keys existan
if (!ILOVEPDF_PUBLIC_API_KEY || !ILOVEPDF_SECRET_API_KEY) {
  console.error("❌ ERROR: Faltan API keys de ILovePDF en el archivo .env");
  console.error("ILOVEPDF_PUBLIC_API_KEY:", ILOVEPDF_PUBLIC_API_KEY ? "✓ Presente" : "✗ Faltante");
  console.error("ILOVEPDF_SECRET_API_KEY:", ILOVEPDF_SECRET_API_KEY ? "✓ Presente" : "✗ Faltante");
}

const instance = new ILovePDFApi(
  ILOVEPDF_PUBLIC_API_KEY,
  ILOVEPDF_SECRET_API_KEY
);

const convertPathToPdf = async (archivoUrl) => {
  console.log("🔄 Iniciando conversión con ILovePDF");
  console.log("📎 URL del archivo:", archivoUrl);

  try {
    // 1. Crear tarea
    console.log("📋 Creando tarea officepdf...");
    let task = instance.newTask("officepdf");
    await task.start();
    console.log("✅ Tarea iniciada con ID:", task.taskId);

    // 2. Agregar archivo
    console.log("📤 Agregando archivo desde URL...");
    await task.addFile(archivoUrl);
    console.log("✅ Archivo agregado correctamente");

    // 3. Procesar
    console.log("⚙️ Procesando conversión a PDF...");
    await task.process();
    console.log("✅ Conversión completada");

    // 4. Descargar
    console.log("📥 Descargando PDF resultante...");
    const pdfBuffer = await task.download();
    console.log("✅ PDF descargado. Tamaño:", pdfBuffer.length, "bytes");

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("El PDF descargado está vacío");
    }

    return pdfBuffer;

  } catch (error) {
    console.error("❌ ERROR en convertPathToPdf:");
    console.error("Mensaje:", error.message);
    console.error("Stack:", error.stack);
    if (error.response) {
      console.error("Respuesta del servidor:", error.response.data);
    }
    throw new Error(`Error en conversión: ${error.message}`);
  }
};

module.exports = convertPathToPdf;