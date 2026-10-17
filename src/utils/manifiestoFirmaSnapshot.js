const axios = require("axios");

// Copiar los bytes impide que editar o eliminar la firma del perfil cambie un
// manifiesto ya firmado. Solo se descargan imágenes de nuestro proveedor.
const MAX_BYTES = 1024 * 1024;
const snapshotFirma = async (firma) => {
    if (typeof firma !== "string" || !firma.trim()) throw new Error("La firma está vacía.");
    const valor = firma.trim();
    let buffer;
    if (valor.startsWith("data:image/")) {
        const match = /^data:image\/(?:png|jpeg|jpg);base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(valor);
        if (!match) throw new Error("La firma debe ser una imagen PNG o JPEG válida.");
        buffer = Buffer.from(match[1], "base64");
    } else {
        let url;
        try { url = new URL(valor); } catch { throw new Error("La firma no tiene una URL válida."); }
        if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || url.username || url.password) {
            throw new Error("La firma debe estar alojada en Cloudinary mediante HTTPS.");
        }
        const response = await axios.get(url.toString(), {
            responseType: "arraybuffer", timeout: 10000, maxContentLength: MAX_BYTES, maxRedirects: 0,
        });
        buffer = Buffer.from(response.data);
    }
    if (!buffer.length || buffer.length > MAX_BYTES) throw new Error("La imagen de firma supera el tamaño permitido de 1 MB o está vacía.");
    const esPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const esJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (!esPng && !esJpeg) throw new Error("La firma debe ser una imagen PNG o JPEG válida.");
    return `data:image/${esPng ? "png" : "jpeg"};base64,${buffer.toString("base64")}`;
};

module.exports = snapshotFirma;
