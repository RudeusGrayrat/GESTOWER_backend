const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const cleanBase64 = require("../../../../utils/cleanBase64");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");

const postGenerador = async (req, res) => {
    const uploadedPublicIds = []; // Track para rollback

    try {
        const {
            razonSocial, ruc, correoElectronico, direccion,
            telefono, representanteLegal, dniRepresentante, plantas, responsablesTecnicos, estado
        } = req.body;

        if (!razonSocial || !ruc || !correoElectronico || !direccion ||
            !telefono || !representanteLegal || !dniRepresentante) {
            return res.status(400).json({
                message: "Faltan datos requeridos para crear el generador",
                type: "Error"
            });
        }

        const findGenerador = await Generador.findOne({ ruc });
        if (findGenerador) {
            return res.status(400).json({
                message: "El generador con este RUC ya existe",
                type: "Error"
            });
        }

        // ── Subir firmas de responsables técnicos ──
        const responsablesConFirma = await Promise.all(
            (responsablesTecnicos || []).map(async (responsable) => {
                if (!responsable.firmaResponsable) return responsable;

                const fileBuffer = Buffer.from(cleanBase64(responsable.firmaResponsable), "base64");
                const fileName = `firma_responsable_${responsable.dniResponsable}`;
                const result = await uploadImage(fileBuffer, fileName);

                uploadedPublicIds.push(extractPublicId(result.secure_url));

                return { ...responsable, firmaResponsable: result.secure_url };
            })
        );

        // ── 3. Guardar en BD ──
        const newGenerador = new Generador({
            razonSocial, ruc, correoElectronico, direccion,
            telefono, representanteLegal, dniRepresentante,
            plantas,
            responsablesTecnicos: responsablesConFirma,
            estado: estado || "ACTIVO",
        });

        await newGenerador.save();

        return res.status(201).json({
            message: "Generador creado exitosamente",
            data: newGenerador,
            type: "Correcto"
        });

    } catch (error) {
        // ── Rollback: eliminar imágenes subidas si algo falló ──
        if (uploadedPublicIds.length > 0) {
            await Promise.allSettled(
                uploadedPublicIds.map((id) => deleteImage(id))
            );
        }

        return res.status(500).json({
            message: error.message || "Error al crear el generador",
            type: "Error"
        });
    }
};

module.exports = postGenerador;