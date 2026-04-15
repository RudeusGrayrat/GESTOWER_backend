const libre = require("libreoffice-convert");

const convertToPdf = async (wordBuffer) => {
  console.log("--- Inicio de Conversión ---");

  console.time("⏱️ 1. Preparación de buffer");
  console.timeEnd("⏱️ 1. Preparación de buffer");

  console.time("🚀 2. Ejecución LibreOffice");
  try {
    const pdfBuffer = await new Promise((resolve, reject) => {
      libre.convert(wordBuffer, ".pdf", undefined, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
    console.timeEnd("🚀 2. Ejecución LibreOffice");

    if (!pdfBuffer || pdfBuffer.length === 0) throw new Error("PDF Vacío");

    console.time("📂 3. Finalización y envío");
    console.timeEnd("📂 3. Finalización y envío");

    return pdfBuffer;
  } catch (error) {
    console.timeEnd("🚀 2. Ejecución LibreOffice");
    throw error;
  }
};

module.exports = convertToPdf;