const { exec } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { promisify } = require("util");
const execAsync = promisify(exec);

const convertToPdf = async (wordBuffer) => {
  console.time("🚀 Unoserver-Direct-CLI");
  console.time("⏱️ Tiempo convertPDF");

  // Un directorio por conversión evita colisiones entre solicitudes simultáneas.
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gestower-pdf-"));
  const tempDocx = path.join(tempDir, "input.docx");
  const tempPdf = path.join(tempDir, "output.pdf");

  try {
    // 1. Escribimos el buffer a un archivo temporal rápido
    fs.writeFileSync(tempDocx, wordBuffer);

    // 2. Ejecutamos unoconvert (el cliente que habla con unoserver-core)
    // Usamos el puerto por defecto de unoserver (2002)
    await execAsync(`unoconvert --convert-to pdf ${tempDocx} ${tempPdf}`);

    // 3. Leemos el PDF generado
    const pdfBuffer = fs.readFileSync(tempPdf);

    console.timeEnd("🚀 Unoserver-Direct-CLI");

    console.timeEnd("⏱️ Tiempo convertPDF");
    return pdfBuffer;

  } catch (error) {
    if (console.timeEnd) console.timeEnd("🚀 Unoserver-Direct-CLI");
    console.error("❌ Error en unoconvert CLI:", error.message);
    console.timeEnd("⏱️ Tiempo convertPDF");

    throw new Error("Fallo en la conversión rápida de sistema.");
  } finally {
    // No persiste ningún DOCX o PDF después de responder, incluso ante error.
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

module.exports = convertToPdf;
