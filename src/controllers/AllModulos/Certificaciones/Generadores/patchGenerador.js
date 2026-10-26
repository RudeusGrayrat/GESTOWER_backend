const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");
const validarFirmaCarga = require("../../../../utils/validarFirmaCarga");
const { randomUUID } = require("crypto");

const patchGenerador = async (req, res) => {
    const uploadedPublicIds = [];
    let guardado = false;

    try {
        const { generadorId } = req.params;
        const {
            razonSocial, ruc, correoElectronico, telefono,
            representanteLegal, dniRepresentante, plantas, responsablesTecnicos, estado
        } = req.body;

        if (!generadorId) {
            return res.status(400).json({ message: "El ID del generador es requerido", type: "Error" });
        }

        const findGenerador = await Generador.findById(generadorId);
        if (!findGenerador) {
            return res.status(404).json({ message: "Generador no encontrado", type: "Error" });
        }

        // Actualizaciones básicas
        if (razonSocial) findGenerador.razonSocial = razonSocial;
        if (ruc) findGenerador.ruc = ruc;
        if (correoElectronico) findGenerador.correoElectronico = correoElectronico;
        if (telefono) findGenerador.telefono = telefono;
        if (representanteLegal) findGenerador.representanteLegal = representanteLegal;
        if (dniRepresentante) findGenerador.dniRepresentante = dniRepresentante;
        if (plantas) findGenerador.plantas = plantas;
        if (estado) findGenerador.estado = estado;

        // Firmas de responsables
        if (responsablesTecnicos) {
            const firmasValidadas = await Promise.all(
                responsablesTecnicos.map(async (responsable) => {
                    const responsableAnterior = findGenerador.responsablesTecnicos.find((r) => (responsable._id && String(r._id) === String(responsable._id)) || r.dniResponsable === responsable.dniResponsable);
                    if (!responsable.firmaResponsable || responsableAnterior?.firmaResponsable === responsable.firmaResponsable) return null;
                    return validarFirmaCarga(responsable.firmaResponsable);
                })
            );
            const responsablesActualizados = [];
            for (let i = 0; i < responsablesTecnicos.length; i++) {
                const responsable = responsablesTecnicos[i];
                if (!firmasValidadas[i]) {
                    responsablesActualizados.push(responsable);
                    continue;
                }
                const result = await uploadImage(firmasValidadas[i], `firma_responsable_${randomUUID()}`);
                uploadedPublicIds.push(extractPublicId(result.secure_url));
                responsablesActualizados.push({ ...responsable, firmaResponsable: result.secure_url });
            }
            findGenerador.responsablesTecnicos = responsablesActualizados;
        }

        const updatedGenerador = await findGenerador.save();
        guardado = true;

        try {
            await NotificationService.send(req.app.get("io"), {
                type: "SUBMODULE",
                title: "Generador Actualizado",
                message: `Se actualizaron los datos del generador ${updatedGenerador.razonSocial} (RUC: ${updatedGenerador.ruc}).`,
                creator: { model: "System" },
                scope: { submoduleName: "GENERADORES", moduleName: "CERTIFICACIONES" },
                entity: { id: updatedGenerador._id, model: "Generador" }
            });
        } catch (notificationError) {
            console.error("No se pudo notificar la actualización del generador:", notificationError);
        }

        return res.status(200).json({
            message: "Generador actualizado correctamente",
            data: updatedGenerador,
            type: "Correcto"
        });

    } catch (error) {
        if (!guardado && uploadedPublicIds.length > 0) {
            await Promise.allSettled(uploadedPublicIds.map((id) => deleteImage(id)));
        }
        return res.status(error.firmaInvalida ? 400 : 500).json({ message: error.message || "Error al actualizar el generador", type: "Error" });
    }
};

module.exports = patchGenerador;
