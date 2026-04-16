const axios = require("axios");
const FormData = require("form-data");

/**
 * Convierte un documento a PDF. 
 * Soporta Buffer directo o URL de descarga.
 */
const convertToPdf = async (input) => {
    console.time("🚀 Unoserver-Latencia");
    let wordBuffer;

    try {
        // 1. VALIDACIÓN Y OBTENCIÓN DEL BUFFER
        if (Buffer.isBuffer(input)) {
            // Si ya es un buffer (lo que viene de convertDocx)
            wordBuffer = input;
        } else if (typeof input === "string" && input.startsWith("http")) {
            // Si es una URL, descargamos el archivo primero
            console.log("🔗 Detectada URL, descargando recurso...");
            const download = await axios.get(input, { responseType: "arraybuffer" });
            wordBuffer = Buffer.from(download.data);
        } else {
            // Si no es ninguno, abortamos antes de tocar el servidor
            throw new Error("Entrada inválida: Se esperaba un Buffer o una URL válida.");
        }

        // 2. PREPARACIÓN PARA UNOSERVER
        const form = new FormData();
        form.append("file", wordBuffer, {
            filename: "document.docx",
            contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        // 3. LLAMADA A UNOSERVER (Optimizado)
        const response = await axios.post("http://localhost:2003", form, {
            headers: form.getHeaders(),
            responseType: "arraybuffer",
            timeout: 7000, // Timeout razonable
        });

        console.timeEnd("🚀 Unoserver-Latencia");

        const pdfBuffer = Buffer.from(response.data);

        // Verificación de tamaño mínimo (evita archivos corruptos de 330 bytes)
        if (!pdfBuffer || pdfBuffer.length < 500) {
            throw new Error("El PDF devuelto por Unoserver parece estar corrupto o incompleto.");
        }

        return pdfBuffer;

    } catch (error) {
        if (console.timeEnd) console.timeEnd("🚀 Unoserver-Latencia");

        // Log detallado para el administrador (tú)
        console.error("❌ Error en convertToPdf:", error.message);

        // Re-lanzamos el error para que generarPdfHE lo capture y envíe el 500
        throw error;
    }
};

module.exports = convertToPdf;