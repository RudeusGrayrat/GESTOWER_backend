const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");

const patchGenerador = async (req, res) => {
    const uploadedPublicIds = []; // Track para rollback

    try {
        const { generadorId } = req.params;
        const {
            razonSocial, ruc, correoElectronico, telefono,
            representanteLegal, dniRepresentante, plantas, responsablesTecnicos, estado
        } = req.body;

        if (!generadorId) {
            return res.status(400).json({
                message: "El ID del generador es requerido",
                type: "Error"
            });
        }

        const findGenerador = await Generador.findById(generadorId);
        if (!findGenerador) {
            return res.status(404).json({
                message: "Generador no encontrado",
                type: "Error"
            });
        }

        // ── Campos simples ──
        if (razonSocial) findGenerador.razonSocial = razonSocial;
        if (ruc) findGenerador.ruc = ruc;
        if (correoElectronico) findGenerador.correoElectronico = correoElectronico;
        if (telefono) findGenerador.telefono = telefono;
        if (representanteLegal) findGenerador.representanteLegal = representanteLegal;
        if (dniRepresentante) findGenerador.dniRepresentante = dniRepresentante;
        if (plantas) findGenerador.plantas = plantas;
        if (estado) findGenerador.estado = estado;


        // ── Actualizar firmas de responsables técnicos ──
        if (responsablesTecnicos) {
            const responsablesActualizados = await Promise.all(
                responsablesTecnicos.map(async (responsable) => {
                    // Si no trae firma en base64, no tocar la URL existente
                    const esBase64 = responsable.firmaResponsable &&
                        !responsable.firmaResponsable.startsWith("http");

                    if (!esBase64) return responsable;

                    // Eliminar firma anterior si el responsable ya existía
                    const responsableAnterior = findGenerador.responsablesTecnicos
                        .find((r) => r.dniResponsable === responsable.dniResponsable);

                    // ✅ Solo elimina si existe la firma anterior
                    if (responsableAnterior?.firmaResponsable) {
                        const oldPublicId = extractPublicId(responsableAnterior.firmaResponsable);
                        await deleteImage(oldPublicId);
                    }

                    const fileBuffer = Buffer.from(responsable.firmaResponsable, "base64");
                    const fileName = `firma_responsable_${responsable.dniResponsable}`;
                    const result = await uploadImage(fileBuffer, fileName);

                    uploadedPublicIds.push(extractPublicId(result.secure_url));

                    return { ...responsable, firmaResponsable: result.secure_url };
                })
            );

            findGenerador.responsablesTecnicos = responsablesActualizados;
        }

        const updatedGenerador = await findGenerador.save();
        return res.status(200).json({
            message: "Generador actualizado exitosamente",
            data: updatedGenerador,
            type: "Correcto"
        });

    } catch (error) {
        // ── Rollback: eliminar SOLO las nuevas imágenes subidas en esta request ──
        if (uploadedPublicIds.length > 0) {
            await Promise.allSettled(
                uploadedPublicIds.map((id) => deleteImage(id))
            );
        }
        console.error("Error en patchGenerador:", error);
        return res.status(500).json({
            message: error.message || "Error al actualizar el generador",
            type: "Error"
        });
    }
};

module.exports = patchGenerador;