const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");
const bcrypt = require("bcrypt");
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
            representanteLegal, dniRepresentante, plantas, responsablesTecnicos, estado,
            usuarioManifestower, password // ⬅️ Parámetros de control
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
        if (usuarioManifestower !== undefined) findGenerador.usuarioManifestower = usuarioManifestower;

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

        // ── LÓGICA DE CONTROL DE USUARIO EN PATCH ──
        if (usuarioManifestower === true) {
            const usuarioExistente = await UserExternal.findOne({ ruc: findGenerador.ruc });
            const salt = await bcrypt.genSalt(10);

            // Si mandan password personalizado lo usamos, sino por defecto su RUC
            const contraseñaDefecto = password ? password : findGenerador.ruc;
            const hashedPassword = await bcrypt.hash(contraseñaDefecto, salt);

            if (usuarioExistente) {
                // ⚠️ Alerta si ya tenía el acceso de Generador previamente
                if (usuarioExistente.roles.includes("GENERADOR")) {
                    return res.status(400).json({
                        message: "El usuario ya cuenta con un acceso activo para este módulo.",
                        type: "Alerta"
                    });
                }
                // Si existía con otro rol, le sumamos este
                usuarioExistente.roles.push("GENERADOR");
                usuarioExistente.generadorId = updatedGenerador._id;
                if (password) usuarioExistente.password = hashedPassword;
                await usuarioExistente.save();
            } else {
                // Crear usuario desde cero
                const nuevoUsuario = new UserExternal({
                    ruc: findGenerador.ruc,
                    password: hashedPassword,
                    roles: ["GENERADOR"],
                    generadorId: updatedGenerador._id,
                    transportistaId: null
                });
                await nuevoUsuario.save();
            }
        }
        else if (usuarioManifestower === false) {
            // 🚫 Desactivación / Eliminación lógica de accesos
            const usuarioExistente = await UserExternal.findOne({ ruc: findGenerador.ruc });
            if (usuarioExistente && usuarioExistente.roles.includes("GENERADOR")) {
                if (usuarioExistente.roles.length === 1) {
                    usuarioExistente.estado = "INACTIVO";
                    usuarioExistente.generadorId = null;
                    await usuarioExistente.save();
                } else {
                    // Si tiene múltiples roles (ej. Transportista), solo removemos privilegios de Generador
                    usuarioExistente.roles = usuarioExistente.roles.filter(role => role !== "GENERADOR");
                    usuarioExistente.generadorId = null;
                    await usuarioExistente.save();
                }
            }
        }

        return res.status(200).json({
            message: "Generador y permisos procesados correctamente",
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
