const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");

const cleanBase64 = (str) => str?.includes(",") ? str.split(",")[1] : str;

const patchTransportista = async (req, res) => {
    const uploadedPublicIds = [];
    const { transportistaId } = req.params;

    try {
        const {
            razonSocial, ruc, registroEors, autorizacionMunicipal, documentoRuta,
            direccion, ubigeoId, correoElectronico, telefono,
            responsableTecnico, representanteLegal, responsables,
            contingencias, generadores, conductores, estado
        } = req.body;

        const findTransportista = await Transportista.findById(transportistaId);
        if (!findTransportista) {
            return res.status(404).json({ message: "Transportista no encontrado", type: "Error" });
        }

        if (ubigeoId) {
            const findUbigeo = await Ubigeo.findById(ubigeoId);
            if (!findUbigeo) return res.status(404).json({ message: "Ubigeo no encontrado", type: "Error" });
            findTransportista.ubigeoId = ubigeoId;
        }

        // ── Campos simples ──
        if (ruc) findTransportista.ruc = ruc;
        if (razonSocial) findTransportista.razonSocial = razonSocial;
        if (registroEors) findTransportista.registroEors = registroEors;
        if (autorizacionMunicipal) findTransportista.autorizacionMunicipal = autorizacionMunicipal;
        if (documentoRuta) findTransportista.documentoRuta = documentoRuta;
        if (direccion) findTransportista.direccion = direccion;
        if (correoElectronico) findTransportista.correoElectronico = correoElectronico;
        if (telefono) findTransportista.telefono = telefono;
        if (responsableTecnico) findTransportista.responsableTecnico = { ...findTransportista.responsableTecnico, ...responsableTecnico };
        if (representanteLegal) findTransportista.representanteLegal = { ...findTransportista.representanteLegal, ...representanteLegal };
        if (contingencias) findTransportista.contingencias = { ...findTransportista.contingencias, ...contingencias };
        if (generadores) findTransportista.generadores = generadores;
        if (conductores) findTransportista.conductores = conductores;
        if (estado) findTransportista.estado = estado;

        // ── Actualizar firmas de responsables ──
        if (responsables) {
            const responsablesActualizados = await Promise.all(
                responsables.map(async (responsable) => {
                    const esBase64 = responsable.firmaResponsable &&
                        !responsable.firmaResponsable.startsWith("http");

                    if (!esBase64) return responsable;

                    // Eliminar firma anterior si existe
                    const responsableAnterior = findTransportista.responsables
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
                    const fileName = `firma_responsable_transportista_${responsable.dni}`;
                    const result = await uploadImage(fileBuffer, fileName);

                    uploadedPublicIds.push(extractPublicId(result.secure_url));
                    return { ...responsable, firmaResponsable: result.secure_url };
                })
            );
            findTransportista.responsables = responsablesActualizados;
        }

        await findTransportista.save();
        return res.status(200).json({ message: "Transportista editado correctamente", data: findTransportista, type: "Correcto" });

    } catch (error) {
        if (uploadedPublicIds.length > 0) {
            await Promise.allSettled(uploadedPublicIds.map((id) => deleteImage(id)));
        }
        console.error("Error en patchTransportista:", error);
        return res.status(500).json({ message: error.message, type: "Error" });
    }
};

module.exports = patchTransportista;