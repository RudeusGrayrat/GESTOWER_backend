const snapshotFirma = require("./manifiestoFirmaSnapshot");

// Admite tanto los data URL actuales como el Base64 sin prefijo de formularios antiguos.
module.exports = async (valor) => {
    if (typeof valor !== "string") {
        const error = new Error("La firma debe ser una imagen PNG o JPEG válida.");
        error.firmaInvalida = true;
        throw error;
    }
    try {
        const dataUrl = valor.startsWith("data:") ? valor : `data:image/png;base64,${valor}`;
        const normalizada = await snapshotFirma(dataUrl);
        return Buffer.from(normalizada.split(",")[1], "base64");
    } catch (error) {
        error.firmaInvalida = true;
        throw error;
    }
};
