const {
    PDFDocument,
    rgb,
    pushGraphicsState,
    popGraphicsState,
    setFillingColor,
    rectangle,
    fill,
} = require("pdf-lib");

const colorRgb = (hexadecimal) => {
    const normalizado = String(hexadecimal || "").replace("#", "");
    if (!/^[0-9A-F]{6}$/i.test(normalizado)) {
        throw new Error("El color de fondo del PDF no es válido.");
    }
    return rgb(
        Number.parseInt(normalizado.slice(0, 2), 16) / 255,
        Number.parseInt(normalizado.slice(2, 4), 16) / 255,
        Number.parseInt(normalizado.slice(4, 6), 16) / 255,
    );
};

// Inserta un stream al inicio de cada página. Por eso el color queda detrás
// del PDF existente y no tapa texto, checks ni firmas.
const aplicarFondoPdf = async (pdfOriginal, color) => {
    if (!color || String(color).toUpperCase() === "FFFFFF") return pdfOriginal;

    const documento = await PDFDocument.load(pdfOriginal, { updateMetadata: false });
    const fondo = colorRgb(color);

    for (const pagina of documento.getPages()) {
        pagina.node.normalize();
        const stream = pagina.createContentStream(
            pushGraphicsState(),
            setFillingColor(fondo),
            rectangle(0, 0, pagina.getWidth(), pagina.getHeight()),
            fill(),
            popGraphicsState(),
        );
        const referencia = documento.context.register(stream);
        // normalize() convierte Contents en PDFArray; insert(0) garantiza
        // que el rectángulo se pinte antes del contenido original.
        pagina.node.Contents().insert(0, referencia);
    }

    return Buffer.from(await documento.save({ useObjectStreams: false }));
};

module.exports = aplicarFondoPdf;
