const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const execAsync = promisify(exec);

const convertToPdf = async (wordBuffer) => {
  console.time("🚀 Unoserver-Direct-CLI");

  // Creamos rutas temporales únicas para no chocar entre peticiones
  const tempId = Date.now();
  const tempDocx = path.join("/tmp", `input_${tempId}.docx`);
  const tempPdf = path.join("/tmp", `input_${tempId}.pdf`);

  try {
    // 1. Escribimos el buffer a un archivo temporal rápido
    fs.writeFileSync(tempDocx, wordBuffer);

    // 2. Ejecutamos unoconvert (el cliente que habla con unoserver-core)
    // Usamos el puerto por defecto de unoserver (2002)
    await execAsync(`unoconvert --convert-to pdf ${tempDocx} ${tempPdf}`);

    // 3. Leemos el PDF generado
    const pdfBuffer = fs.readFileSync(tempPdf);

    console.timeEnd("🚀 Unoserver-Direct-CLI");

    // 4. Limpieza de archivos temporales (importante en VPS)
    if (fs.existsSync(tempDocx)) fs.unlinkSync(tempDocx);
    if (fs.existsSync(tempPdf)) fs.unlinkSync(tempPdf);

    return pdfBuffer;

  } catch (error) {
    if (console.timeEnd) console.timeEnd("🚀 Unoserver-Direct-CLI");
    console.error("❌ Error en unoconvert CLI:", error.message);

    // Limpiar aunque falle
    if (fs.existsSync(tempDocx)) fs.unlinkSync(tempDocx);
    if (fs.existsSync(tempPdf)) fs.unlinkSync(tempPdf);

    throw new Error("Fallo en la conversión rápida de sistema.");
  }
};

module.exports = convertToPdf;