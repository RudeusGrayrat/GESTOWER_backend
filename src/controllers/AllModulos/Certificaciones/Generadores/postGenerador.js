const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const validarFirmaCarga = require("../../../../utils/validarFirmaCarga");
const { randomUUID } = require("crypto");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");
const bcrypt = require("bcrypt");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");

const postGenerador = async (req, res) => {
    const uploadedPublicIds = [];
    let guardado = false;

    try {
        const {
            razonSocial, ruc, correoElectronico, direccion,
            telefono, representanteLegal, dniRepresentante, plantas, responsablesTecnicos, estado,
            usuarioManifestower // ⬅️ Recibimos el flag desde el front
        } = req.body;

        if (!razonSocial || !ruc || !correoElectronico || !telefono || !representanteLegal || !dniRepresentante) {
            return res.status(400).json({ message: "Faltan datos requeridos para crear el generador", type: "Error" });
        }

        const findGenerador = await Generador.findOne({ ruc });
        if (findGenerador) {
            return res.status(400).json({ message: "El generador con este RUC ya existe", type: "Error" });
        }

        // Subir firmas
        const listaResponsables = responsablesTecnicos || [];
        const firmasValidadas = await Promise.all(listaResponsables.map((r) => r.firmaResponsable ? validarFirmaCarga(r.firmaResponsable) : null));
        const responsablesConFirma = [];
        for (let i = 0; i < listaResponsables.length; i++) {
            const responsable = listaResponsables[i];
            if (!firmasValidadas[i]) { responsablesConFirma.push(responsable); continue; }
            const result = await uploadImage(firmasValidadas[i], `firma_responsable_${randomUUID()}`);
            uploadedPublicIds.push(extractPublicId(result.secure_url));
            responsablesConFirma.push({ ...responsable, firmaResponsable: result.secure_url });
        }

        const newGenerador = new Generador({
            razonSocial, ruc, correoElectronico, direccion,
            telefono, representanteLegal, dniRepresentante,
            plantas, responsablesTecnicos: responsablesConFirma,
            estado: estado || "ACTIVO",
        });

        await newGenerador.save();
        guardado = true;

        // Notifica únicamente al personal de Gestower suscrito al submódulo GENERADORES.
        try {
            await NotificationService.send(req.app.get("io"), {
                type: "SUBMODULE",
                title: "Nuevo Generador Registrado",
                message: `Se registró el generador ${newGenerador.razonSocial} (RUC: ${newGenerador.ruc}).`,
                creator: { model: "System" },
                scope: { submoduleName: "GENERADORES", moduleName: "CERTIFICACIONES" },
                entity: { id: newGenerador._id, model: "Generador" }
            });
        } catch (notificationError) {
            console.error("No se pudo notificar el registro del generador:", notificationError);
        }

        // ── LÓGICA CONDICIONAL DE USUARIO VIA POST ──
        if (usuarioManifestower === true) {
            const usuarioExistente = await UserExternal.findOne({ ruc });
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(ruc, salt); // RUC como contraseña inicial

            if (usuarioExistente) {
                if (!usuarioExistente.roles.includes("GENERADOR")) {
                    usuarioExistente.roles.push("GENERADOR");
                }
                usuarioExistente.generadorId = newGenerador._id;
                await usuarioExistente.save();
            } else {
                const nuevoUsuario = new UserExternal({
                    ruc,
                    password: hashedPassword,
                    roles: ["GENERADOR"],
                    generadorId: newGenerador._id,
                    transportistaId: null
                });
                await nuevoUsuario.save();
            }
        }

        return res.status(201).json({
            message: usuarioManifestower === true
                ? "Generador y cuenta de acceso creados exitosamente"
                : "Generador creado exitosamente (Sin cuenta de usuario)",
            data: newGenerador,
            type: "Correcto"
        });

    } catch (error) {
        if (!guardado && uploadedPublicIds.length > 0) {
            await Promise.allSettled(uploadedPublicIds.map((id) => deleteImage(id)));
        }
        return res.status(error.firmaInvalida ? 400 : 500).json({ message: error.message || "Error al crear el generador", type: "Error" });
    }
};

module.exports = postGenerador;
