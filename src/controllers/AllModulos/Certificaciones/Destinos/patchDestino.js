const Destino = require("../../../../models/AllModulos/Certificacion/Destino");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");

const cleanBase64 = (str) => str?.includes(",") ? str.split(",")[1] : str;

const patchDestino = async (req, res) => {
    const uploadedPublicIds = [];
    const { destinoId } = req.params;
    try {
        const {
            razonSocial,
            ruc,
            codigoRegistroEors,
            autorizacionMunicipal,
            tipoManejo,
            direccion,
            ubigeoId,
            correoElectronico,
            telefono,
            representanteLegal,
            responsableTecnico,
            responsables,
            estado
        } = req.body;

        const findDestino = await Destino.findById(destinoId);
        if (!findDestino) {
            return res.status(404).json({ message: "Destino no encontrado", type: "Error" });
        }

        if (ubigeoId) {
            const findUbigeo = await Ubigeo.findById(ubigeoId);
            if (!findUbigeo) return res.status(404).json({ message: "Ubigeo no encontrado", type: "Error" });
            findDestino.ubigeoId = ubigeoId;
        }

        // ── Campos simples ──
        if (ruc) findDestino.ruc = ruc;
        if (razonSocial) findDestino.razonSocial = razonSocial;
        if (codigoRegistroEors) findDestino.codigoRegistroEors = codigoRegistroEors;
        if (autorizacionMunicipal) findDestino.autorizacionMunicipal = autorizacionMunicipal;
        if (tipoManejo) findDestino.tipoManejo = tipoManejo;
        if (direccion) findDestino.direccion = direccion;
        if (correoElectronico) findDestino.correoElectronico = correoElectronico;
        if (telefono) findDestino.telefono = telefono;
        if (representanteLegal) findDestino.representanteLegal = { ...findDestino.representanteLegal, ...representanteLegal };
        if (responsableTecnico) findDestino.responsableTecnico = { ...findDestino.responsableTecnico, ...responsableTecnico };
        if (estado) findDestino.estado = estado;
        // ── Actualizar firmas de responsables ──
        if (responsables) {
            const responsablesActualizados = await Promise.all(
                responsables.map(async (responsable) => {
                    const esBase64 = responsable.firmaResponsable &&
                        !responsable.firmaResponsable.startsWith("http");

                    if (!esBase64) return responsable;

                    // Eliminar firma anterior si existe
                    const responsableAnterior = findDestino.responsables
                        .find((r) => r.dni === responsable.dni);

                    if (responsableAnterior?.firmaResponsable) {
                        const esUrlCloudinary = responsableAnterior.firmaResponsable.startsWith("http");

                        if (esUrlCloudinary) {
                            // ✅ Solo elimina de Cloudinary si es URL válida
                            const oldPublicId = extractPublicId(responsableAnterior.firmaResponsable);
                            if (oldPublicId) await deleteImage(oldPublicId);
                        }
                        // Si era base64 antiguo — simplemente se reemplaza en BD, no hay nada que eliminar en Cloudinary
                    }
                    const fileBuffer = Buffer.from(cleanBase64(responsable.firmaResponsable), "base64");
                    const fileName = `firma_responsable_destino_${responsable.dni}`;
                    const result = await uploadImage(fileBuffer, fileName);

                    uploadedPublicIds.push(extractPublicId(result.secure_url));
                    return { ...responsable, firmaResponsable: result.secure_url };
                })
            );
            findDestino.responsables = responsablesActualizados;
        }

        await findDestino.save();
        return res.status(200).json({ message: "Destino editado correctamente", data: findDestino, type: "Correcto" });

    } catch (error) {
        if (uploadedPublicIds.length > 0) {
            await Promise.allSettled(uploadedPublicIds.map((id) => deleteImage(id)));
        }
        console.error("Error en patchDestino:", error);
        return res.status(500).json({ message: error.message, type: "Error" });
    }
};

module.exports = patchDestino;