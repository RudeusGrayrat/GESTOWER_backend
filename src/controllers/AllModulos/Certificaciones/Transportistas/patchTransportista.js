const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");
const bcrypt = require("bcrypt");

const patchTransportista = async (req, res) => {
    const uploadedPublicIds = [];

    try {
        const { transportistaId } = req.params;
        const {
            razonSocial, ruc, registroEors, autorizacionMunicipal, documentoRuta,
            direccion, ubigeoId, correoElectronico, telefono, representanteLegal,
            responsableTecnico, contingencias, responsables, generadores, conductores, estado,
            usuarioManifestower, password // ⬅️ Parámetros de control de credenciales
        } = req.body;
        if (!transportistaId) {
            return res.status(400).json({ message: "El ID del transportista es requerido", type: "Error" });
        }

        const findTransportista = await Transportista.findById(transportistaId);
        if (!findTransportista) {
            return res.status(404).json({ message: "Transportista no encontrado", type: "Error" });
        }

        // Validación de Ubigeo solo si se envía para actualización
        if (ubigeoId) {
            const findUbigeo = await Ubigeo.findById(ubigeoId);
            if (!findUbigeo) {
                return res.status(404).json({ message: "Ubigeo no encontrado", type: "Error" });
            }
            findTransportista.ubigeoId = ubigeoId;
        }

        // Actualizaciones de campos básicos y objetos
        if (razonSocial) findTransportista.razonSocial = razonSocial;
        if (ruc) findTransportista.ruc = ruc;
        if (registroEors) findTransportista.registroEors = registroEors;
        if (autorizacionMunicipal) findTransportista.autorizacionMunicipal = autorizacionMunicipal;
        if (documentoRuta) findTransportista.documentoRuta = documentoRuta;
        if (direccion) findTransportista.direccion = direccion;
        if (correoElectronico) findTransportista.correoElectronico = correoElectronico;
        if (telefono) findTransportista.telefono = telefono;
        if (representanteLegal) findTransportista.representanteLegal = representanteLegal;
        if (responsableTecnico) findTransportista.responsableTecnico = responsableTecnico;
        if (contingencias) findTransportista.contingencias = contingencias;
        if (generadores) findTransportista.generadores = generadores;
        if (conductores) findTransportista.conductores = conductores;
        if (usuarioManifestower !== undefined) findTransportista.usuarioManifestower = usuarioManifestower;
        if (estado) findTransportista.estado = estado;

        // Gestión y Reemplazo de Firmas Base64 en el Array de Responsables
        if (responsables) {
            const responsablesActualizados = await Promise.all(
                responsables.map(async (responsable) => {
                    // Detectar si la firma viene en Base64 o es un link HTTP antiguo
                    const esBase64 = responsable.firmaResponsable && !responsable.firmaResponsable.startsWith("http");
                    if (!esBase64) return responsable;

                    // Buscar si este responsable ya existía mediante su DNI para borrar su firma previa de Cloudinary
                    const responsableAnterior = findTransportista.responsables.find((r) => r.dni === responsable.dni);
                    if (responsableAnterior?.firmaResponsable) {
                        const oldPublicId = extractPublicId(responsableAnterior.firmaResponsable);
                        await deleteImage(oldPublicId);
                    }

                    // Subir la nueva firma
                    const fileBuffer = Buffer.from(responsable.firmaResponsable, "base64");
                    const fileName = `firma_responsable_trans_${responsable.dni || Date.now()}`;
                    const result = await uploadImage(fileBuffer, fileName);
                    uploadedPublicIds.push(extractPublicId(result.secure_url));

                    return { ...responsable, firmaResponsable: result.secure_url };
                })
            );
            findTransportista.responsables = responsablesActualizados;
        }

        // Guardamos los cambios principales en la colección de Transportistas
        const updatedTransportista = await findTransportista.save();

        // ── LÓGICA ESPEJO DE CONTROL DE USUARIO EN PATCH ──
        if (usuarioManifestower === true) {
            const usuarioExistente = await UserExternal.findOne({ ruc: findTransportista.ruc });
            const salt = await bcrypt.genSalt(10);

            // Si mandan password personalizado lo usamos, de lo contrario usamos su RUC por defecto
            const contraseñaDefecto = password ? password : findTransportista.ruc;
            const hashedPassword = await bcrypt.hash(contraseñaDefecto, salt);

            if (usuarioExistente) {
                // ⚠️ Alerta si ya tenía el rol asignado previamente
                if (usuarioExistente.roles.includes("TRANSPORTISTA")) {
                    return res.status(400).json({
                        message: "El usuario ya cuenta con un acceso activo para este módulo.",
                        type: "Alerta"
                    });
                }
                // Si existía con otro rol (ej: GENERADOR), le agregamos el rol híbrido
                usuarioExistente.roles.push("TRANSPORTISTA");
                usuarioExistente.transportistaId = updatedTransportista._id;
                if (password) usuarioExistente.password = hashedPassword;
                await usuarioExistente.save();
            } else {
                // Crear la cuenta desde cero si el RUC no existía en el sistema
                const nuevoUsuario = new UserExternal({
                    ruc: findTransportista.ruc,
                    password: hashedPassword,
                    roles: ["TRANSPORTISTA"],
                    transportistaId: updatedTransportista._id,
                    generadorId: null
                });
                await nuevoUsuario.save();
            }
        }
        else if (usuarioManifestower === false) {
            // 🚫 Revocación/Desactivación de accesos operacionales
            const usuarioExistente = await UserExternal.findOne({ ruc: findTransportista.ruc });
            if (usuarioExistente && usuarioExistente.roles.includes("TRANSPORTISTA")) {
                if (usuarioExistente.roles.length === 1) {
                    // Si solo operaba como transportista, pasamos la cuenta completa a INACTIVO
                    usuarioExistente.estado = "INACTIVO";
                    usuarioExistente.transportistaId = null;
                    await usuarioExistente.save();
                } else {
                    // Si tiene múltiples roles (ej. es Generador y Transportista), solo removemos este rol
                    usuarioExistente.roles = usuarioExistente.roles.filter(role => role !== "TRANSPORTISTA");
                    usuarioExistente.transportistaId = null;
                    await usuarioExistente.save();
                }
            }
        }

        return res.status(200).json({
            message: "Transportista y permisos procesados correctamente",
            data: updatedTransportista,
            type: "Correcto"
        });

    } catch (error) {
        // En caso de caída del servidor o base de datos, limpiamos las firmas subidas en esta iteración
        if (uploadedPublicIds.length > 0) {
            await Promise.allSettled(uploadedPublicIds.map((id) => deleteImage(id)));
        }
        return res.status(500).json({
            message: error.message || "Error al actualizar el transportista",
            type: "Error"
        });
    }
};

module.exports = patchTransportista;