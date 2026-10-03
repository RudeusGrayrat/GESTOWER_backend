const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
let sharp;
try {
    sharp = require("sharp");
} catch (error) {
    // La generación documental sigue operativa aunque falte la mejora visual opcional.
    console.warn("Sharp no está disponible; la marca de agua conservará el logo original.");
}

const IMAGEN_TRANSPARENTE = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLkNwAAAABJRU5ErkJggg==",
    "base64"
);

const obtenerDimensionesImagen = (imageData) => {
    const bytes = new Uint8Array(imageData);

    if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
        return {
            width: (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19],
            height: (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23],
        };
    }

    if (bytes.length >= 10 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        return { width: bytes[6] | (bytes[7] << 8), height: bytes[8] | (bytes[9] << 8) };
    }

    if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
        let offset = 2;
        const markers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
        while (offset + 8 < bytes.length) {
            if (bytes[offset] !== 0xff) {
                offset += 1;
                continue;
            }
            const marker = bytes[offset + 1];
            const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
            if (markers.has(marker)) {
                return {
                    width: (bytes[offset + 7] << 8) | bytes[offset + 8],
                    height: (bytes[offset + 5] << 8) | (bytes[offset + 6]),
                };
            }
            offset += 2 + length;
        }
    }

    return null;
};

const calcularTamanoProporcional = (imageData, maxWidth, maxHeight) => {
    const dimensions = obtenerDimensionesImagen(imageData);
    if (!dimensions?.width || !dimensions?.height) return [maxWidth, maxHeight];

    const scale = Math.min(maxWidth / dimensions.width, maxHeight / dimensions.height);
    return [Math.round(dimensions.width * scale), Math.round(dimensions.height * scale)];
};

const prepararMarcaAgua = async (imageBuffer) => {
    if (!sharp) return imageBuffer;
    try {
        const anchoLienzo = 506;
        const altoLienzo = 238;
        const anguloMarcaAgua = -36.646;
        const imagen = sharp(imageBuffer).ensureAlpha();
        const logoProporcional = await imagen
            .resize(anchoLienzo, altoLienzo, { fit: "inside", withoutEnlargement: false })
            .png()
            .toBuffer();
        // La plantilla nueva mantiene recto el cuadro; el logo conserva el giro
        // original dentro de un lienzo transparente que no rebasa sus limites.
        const logoRotado = await sharp(logoProporcional)
            .rotate(anguloMarcaAgua, { background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .resize(anchoLienzo, altoLienzo, { fit: "inside", withoutEnlargement: false })
            .png()
            .toBuffer();

        return await sharp({ create: { width: anchoLienzo, height: altoLienzo, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } })
            .composite([{ input: logoRotado, gravity: "center" }])
            .png()
            .toBuffer();
    } catch (error) {
        console.warn("No se pudo aclarar la marca de agua; se usará el logo original.", error.message);
        return imageBuffer;
    }
};

const convertDocx = async (predata, templatePath, options = {}) => {
    try {
        console.time("⏱️ Tiempo convertDocx");
        const content = fs.readFileSync(path.resolve(templatePath), "binary");
        const zip = new PizZip(content);

        const imageOptions = {
            centered: false,
            getImage: async (tagValue, tagName) => {
                // Logo y firma son opcionales: se conserva el espacio de la plantilla vacío.
                if (!tagValue) return IMAGEN_TRANSPARENTE;
                let imageBuffer;

                // CASO 1: URL externa
                if (tagValue.startsWith("http")) {
                    const response = await axios.get(tagValue, { responseType: "arraybuffer" });
                    imageBuffer = Buffer.from(response.data);
                }

                // CASO 2: Base64
                else if (tagValue.startsWith("data:image")) {
                    const base64Data = tagValue.split(",")[1];
                    imageBuffer = Buffer.from(base64Data, "base64");
                }

                // CASO 3: Ruta local
                // Si tagValue es una ruta absoluta (empieza con C:\ o /), la usamos directo
                // Si no, la resolvemos desde la raíz del proyecto
                else {
                    const finalPath = tagValue.startsWith("/uploads/")
                        ? path.join(process.cwd(), "storage", tagValue.replace(/^\/uploads\//, ""))
                        : path.isAbsolute(tagValue)
                            ? tagValue
                            : path.join(process.cwd(), "templates", "images", tagValue.replace(/^\//, ""));

                    if (!fs.existsSync(finalPath)) {
                        console.error("❌ Imagen no encontrada en:", finalPath);
                        throw new Error(`Imagen no encontrada: ${finalPath}`);
                    }
                    imageBuffer = fs.readFileSync(finalPath);
                }

                return tagName === "logo_empresa" && options.marcaAguaBoleta
                    ? prepararMarcaAgua(imageBuffer)
                    : imageBuffer;
            },
            getSize: (imageData, tagValue, tagName) => {
                // Cada imagen ocupa su espacio máximo sin perder su proporción original.
                // La marca de agua ocupa siempre el ancho definido por su cuadro de texto.
                if (tagName === "logo_empresa" && options.marcaAguaBoleta) return [506, 238];
                if (tagName === "logo_empresa") return calcularTamanoProporcional(imageData, 506, 238);
                if (tagName === "logo_encabezado") return calcularTamanoProporcional(imageData, 108, 48);
                if (tagName === "firma") return calcularTamanoProporcional(imageData, 106, 72);
                if (tagName === "url_imagen") return [180, 130];
                return [100, 100]; // Tamaño por defecto
            },
        };

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: "{{", end: "}}" },
            modules: [new ImageModule(imageOptions)],
        });
        await doc.renderAsync(predata);
        console.timeEnd("⏱️ Tiempo convertDocx");
        return doc.getZip().generate({ type: "nodebuffer" });
    } catch (error) {
        console.timeEnd("⏱️ Tiempo convertDocx");
        console.error("Error en convertDocx util:", error);
        throw error;
    }
};

module.exports = convertDocx;
