const axios = require("axios");
const FormData = require("form-data");

const convertToPdf = async (wordBuffer) => {
  console.time("🚀 Ejecución unoserver");
  try {
    const form = new FormData();
    form.append("file", wordBuffer, {
      filename: "document.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const response = await axios.post("http://localhost:2003", form, {
      headers: form.getHeaders(),
      responseType: "arraybuffer",
      timeout: 10000,
    });

    console.timeEnd("🚀 Ejecución unoserver");

    const pdfBuffer = Buffer.from(response.data);
    if (!pdfBuffer || pdfBuffer.length === 0) throw new Error("PDF Vacío");

    return pdfBuffer;
  } catch (error) {
    console.timeEnd("🚀 Ejecución unoserver");
    throw error;
  }
};

module.exports = convertToPdf;