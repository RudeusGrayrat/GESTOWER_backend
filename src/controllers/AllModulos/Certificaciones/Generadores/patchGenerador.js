const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");
const bcrypt = require("bcrypt");

const patchGenerador = async (req, res) => {
    const uploadedPublicIds = [];

    try {
        const { generadorId } = req.params;
        const {
            razonSocial, ruc, correoElectronico, telefono,
            representanteLegal, dniRepresentante, plantas, responsablesTecnicos, estado,
            password // <-- Recibimos password desde el check del ERP para aprobar/crear cuenta
        } = req.body;

        if (!generadorId) {
            return res.status(400).json({ message: "El ID del generador es requerido", type: "Error" });
        }

        const findGenerador = await Generador.findById(generadorId);
        if (!findGenerador) {
            return res.status(404).json({ message: "Generador no encontrado", type: "Error" });
        }

        // Actualizaciones de campos comunes
        if (razonSocial) findGenerador.razonSocial = razonSocial;
        if (ruc) findGenerador.ruc = ruc;
        if (correoElectronico) findGenerador.correoElectronico = correoElectronico;
        if (telefono) findGenerador.telefono = telefono;
        if (representanteLegal) findGenerador.representanteLegal = representanteLegal;
        if (dniRepresentante) findGenerador.dniRepresentante = dniRepresentante;
        if (plantas) findGenerador.plantas = plantas;
        if (estado) findGenerador.estado = estado;

        // Actualizar firmas de responsables
        if (responsablesTecnicos) {
            const responsablesActualizados = await Promise.all(
                responsablesTecnicos.map(async (responsable) => {
                    const esBase64 = responsable.firmaResponsable && !responsable.firmaResponsable.startsWith("http");
                    if (!esBase64) return responsable;

                    const responsableAnterior = findGenerador.responsablesTecnicos.find((r) => r.dniResponsable === responsable.dniResponsable);
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

        // ── LÓGICA DE APROBACIÓN DE USUARIO POR SISTEMAS ──
        if (password) {
            const usuarioExistente = await UserExternal.findOne({ ruc: findGenerador.ruc });
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            if (usuarioExistente) {
                // Si el usuario ya existía (ej. como Transportista), unimos los roles
                if (!usuarioExistente.roles.includes("GENERADOR")) {
                    usuarioExistente.roles.push("GENERADOR");
                }
                usuarioExistente.generadorId = updatedGenerador._id;
                // Si quieres actualizar la contraseña a la digitada en la aprobación:
                usuarioExistente.password = hashedPassword;
                await usuarioExistente.save();
            } else {
                // Si no existía ninguna cuenta con este RUC, la creamos desde cero
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

        return res.status(200).json({
            message: password ? "Generador actualizado y accesos de usuario aprobados" : "Generador actualizado exitosamente",
            data: updatedGenerador,
            type: "Correcto"
        });

    } catch (error) {
        if (uploadedPublicIds.length > 0) {
            await Promise.allSettled(uploadedPublicIds.map((id) => deleteImage(id)));
        }
        return res.status(500).json({ message: error.message || "Error al actualizar el generador", type: "Error" });
    }
};

module.exports = patchGenerador;