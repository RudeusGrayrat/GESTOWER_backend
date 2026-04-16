const axios = require("axios");
const FormData = require("form-data");

const convertToPdf = async (input) => {
  console.time("🚀 Unoserver-Latencia");
  let wordBuffer;

  try {
    if (Buffer.isBuffer(input)) {
      wordBuffer = input;
    } else if (typeof input === "string" && input.startsWith("http")) {
      const download = await axios.get(input, { responseType: "arraybuffer" });
      wordBuffer = Buffer.from(download.data);
    } else {
      throw new Error("Entrada no válida.");
    }

    const form = new FormData();
    // Intentamos con 'file', si falla en el curl, cámbialo a 'data'
    form.append("file", wordBuffer, {
      filename: "reporte.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const response = await axios.post("http://127.0.0.1:2003", form, {
      headers: form.getHeaders(),
      responseType: "arraybuffer",
    });

    console.timeEnd("🚀 Unoserver-Latencia");
    const pdfBuffer = Buffer.from(response.data);

    // REVISIÓN DE SEGURIDAD
    if (pdfBuffer.length < 500) {
      // Imprimimos el error real que viene de unoserver
      console.error("⚠️ Contenido recibido de Unoserver:", pdfBuffer.toString());
      throw new Error("El PDF devuelto es demasiado pequeño o es un error de texto.");
    }

    return pdfBuffer;

  } catch (error) {
    // Evitamos el warning de console.timeEnd
    try { console.timeEnd("🚀 Unoserver-Latencia"); } catch (e) { }

    const errorData = error.response ? Buffer.from(error.response.data).toString() : error.message;
    console.error("❌ Error en convertToPdf:", errorData);
    throw new Error(`Error en conversión: ${errorData}`);
  }
};

module.exports = convertToPdf;