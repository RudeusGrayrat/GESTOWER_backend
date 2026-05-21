const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const convertDocx = async (predata, templatePath) => {
    try {
        console.time("⏱️ Tiempo convertDocx");
        const content = fs.readFileSync(path.resolve(templatePath), "binary");
        const zip = new PizZip(content);

        const imageOptions = {
            centered: false,
            getImage: async (tagValue) => {
                // CASO 1: URL externa
                if (tagValue.startsWith("http")) {
                    const response = await axios.get(tagValue, { responseType: "arraybuffer" });
                    return response.data;
                }

                // CASO 2: Base64
                if (tagValue.startsWith("data:image")) {
                    const base64Data = tagValue.split(",")[1];
                    return Buffer.from(base64Data, "base64");
                }

                // CASO 3: Ruta local
                // Si tagValue es una ruta absoluta (empieza con C:\ o /), la usamos directo
                // Si no, la resolvemos desde la raíz del proyecto
                const finalPath = path.isAbsolute(tagValue)
                    ? tagValue
                    : path.join(process.cwd(), "templates", "images", tagValue.replace(/^\//, ""));

                if (!fs.existsSync(finalPath)) {
                    console.error("❌ Imagen no encontrada en:", finalPath);
                    throw new Error(`Imagen no encontrada: ${finalPath}`);
                }

                return fs.readFileSync(finalPath);
            },
            getSize: (img, tagValue, tagName) => {
                // Puedes personalizar el tamaño según el nombre del tag en el Word
                if (tagName === "logo_empresa") return [140, 70];
                if (tagName === "firma") return [150, 80];
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