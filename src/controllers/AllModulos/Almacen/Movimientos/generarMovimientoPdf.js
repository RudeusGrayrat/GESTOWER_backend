const dayjs = require("dayjs");
const Movimiento = require("../../../../models/AllModulos/Almacen/Movimiento");
const convertToPdf = require("../../../../utils/convertToPdf");
const convertDocx = require("../../../../utils/convertDocx");
const path = require("path");
const axios = require("axios"); // Asegúrate de tener axios requerido aquí arriba

const generarPDFMovimientoAlmacen = async (req, res) => {
    try {
        const { movimientoId } = req.params;
        const rootPath = process.cwd();

        if (!movimientoId) {
            return res.status(400).json({ message: "ID del movimiento es obligatorio", type: "Advertencia" });
        }

        const movimiento = await Movimiento.findById(movimientoId)
            .populate("contratoId")
            .populate("sedeId")
            .populate("creadoPor", "name lastname");

        if (!movimiento) {
            return res.status(404).json({ message: "Movimiento de almacén no encontrado", type: "Error" });
        }

        const safe = (value) => {
            if (value === undefined || value === null) return "";
            if (typeof value === 'string') return value;
            if (typeof value === 'number') return value.toString();
            return String(value);
        };

        const datosGenerales = movimiento.datosGenerales || {};

        // ===== SOLUCIÓN CRÍTICA: PROCESAMIENTO PREVIO DE IMÁGENES =====
        // Descargamos las imágenes aquí en paralelo para entregarle los datos listos a docxtemplater.
        const promesasImagenes = (movimiento.referenciaImagen || []).map(async (url) => {
            try {
                if (url && url.startsWith("http")) {
                    const response = await axios.get(url, { responseType: "arraybuffer" });

                    // Convertimos el Buffer a una cadena Base64 con el prefijo "data:image"
                    // Esto hará que en convertDocx.js entre directamente en el "CASO 2: Base64"
                    // ejecutando 'Buffer.from(base64Data, "base64")' síncronamente de forma interna.
                    const base64String = `data:image/jpeg;base64,${Buffer.from(response.data).toString("base64")}`;

                    return {
                        url_imagen: base64String
                    };
                }
                return null;
            } catch (imgError) {
                console.error(`❌ Error descargando imagen desde el controlador (${url}):`, imgError.message);
                return null;
            }
        });

        // Esperamos que terminen todas las descargas y filtramos los nulos si alguna falló
        const imagenesProcesadas = (await Promise.all(promesasImagenes)).filter(img => img !== null);

        // Creamos la estructura exacta para la data del Word
        const dataDocx = {
            // ===== DATOS GENERALES =====
            tipo_movimiento: "DOCUMENTOS DE " + safe(movimiento.movimiento),
            codigoInterno: safe(movimiento.correlativa),
            cod_mov: movimiento.movimiento === "INGRESO" ? "F-GP-MAT-023" : "F-GP-MAT-024",
            contribuyente: safe(movimiento.contribuyente),
            numeroDocumento: safe(movimiento.numeroDocumento),
            actaIngreso: safe(movimiento.numeroDeActa),
            fecha: safe(datosGenerales.fecha),
            horaIngreso: safe(datosGenerales.horaIngreso),

            // ===== RESPONSABLES =====
            responsableRecepcion: safe(datosGenerales.recepcionadoPor),
            dni: safe(datosGenerales.dniRecepcionadoPor),
            responsableEntrega: safe(datosGenerales.responsableEntrega),
            cip: safe(datosGenerales.registroOCIP),
            estadoActa: safe(datosGenerales.estadoActa),

            // ===== TABLA DINÁMICA DE BIENES INVOLUCRADOS =====
            bienes: (movimiento.descripcionBienes || []).map((bien) => ({
                item: safe(bien.item),
                cant: safe(bien.cantidadIngresada || bien.cantidadDisponible || 0),
                um: safe(bien.unidadDeMedida),
                descripcion: safe(bien.descripcion),
                pesoNeto: safe(bien.pesoNeto),
                pesoBruto: safe(bien.pesoBruto),
                estadoEnvase: safe(bien.estadoEnvase),
                sub1: bien.subItem === "1.1" ? "X" : "",
                sub2: bien.subItem === "1.2" ? "X" : "",
                sub3: bien.subItem === "1.3" ? "X" : "",
            })),

            // ===== CUADROS INFERIORES =====
            detallesDePeso: safe(movimiento.detallesDePeso),
            observaciones: safe(movimiento.observaciones),

            // ===== CONTROL DE TIEMPO DE SALIDA =====
            horaSalida: safe(movimiento.horaSalida),
            fechaSalida: safe(movimiento.fechaSalida),

            // ===== REGISTRO FOTOGRÁFICO =====
            // Pasamos el array con los strings en formato Base64 limpios
            referenciaImagen: imagenesProcesadas
        };

        const archivoPlantilla = "REPORTE_MOVIMIENTO_ALMACEN_WORD.docx";
        const templatePath = path.join(rootPath, "templates", archivoPlantilla);

        const docxWord = await convertDocx(dataDocx, templatePath);
        const pdfBuffer = await convertToPdf(docxWord);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename=Movimiento_${movimiento.correlativa}.pdf`,
        });

        res.send(pdfBuffer);

    } catch (error) {
        console.error("Error generando Word/PDF de Almacén:", error);
        res.status(500).json({ message: "Error interno al generar el archivo", type: "Error" });
    }
};

module.exports = { generarPDFMovimientoAlmacen };