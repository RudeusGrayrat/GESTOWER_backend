const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const cleanBase64 = require("../../../../utils/cleanBase64");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");
const bcrypt = require("bcrypt");

const postGenerador = async (req, res) => {
    const uploadedPublicIds = [];

    try {
        const {
            razonSocial, ruc, correoElectronico, direccion,
            telefono, representanteLegal, dniRepresentante, plantas, responsablesTecnicos, estado
        } = req.body;

        if (!razonSocial || !ruc || !correoElectronico || !telefono || !representanteLegal || !dniRepresentante) {
            return res.status(400).json({ message: "Faltan datos requeridos para crear el generador", type: "Error" });
        }

        // 1. Si ya existe exactamente como Generador
        const findGenerador = await Generador.findOne({ ruc });
        if (findGenerador) {
            return res.status(400).json({ message: "El generador con este RUC ya existe", type: "Error" });
        }

        // Subir firmas
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

        const newGenerador = new Generador({
            razonSocial, ruc, correoElectronico, direccion,
            telefono, representanteLegal, dniRepresentante,
            plantas, responsablesTecnicos: responsablesConFirma,
            estado: estado || "ACTIVO",
        });

        await newGenerador.save();

        // ── LÓGICA AUTOMÁTICA DE USUARIO: Contraseña inicial = RUC ──
        const usuarioExistente = await UserExternal.findOne({ ruc });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ruc, salt); // Usamos el RUC como contraseña

        if (usuarioExistente) {
            // Si ya existía (por ejemplo, registrado como Transportista), unimos los roles
            if (!usuarioExistente.roles.includes("GENERADOR")) {
                usuarioExistente.roles.push("GENERADOR");
            }
            usuarioExistente.generadorId = newGenerador._id;
            usuarioExistente.password = hashedPassword;
            await usuarioExistente.save();
        } else {
            // Si es un usuario completamente nuevo
            const nuevoUsuario = new UserExternal({
                ruc,
                password: hashedPassword,
                roles: ["GENERADOR"],
                generadorId: newGenerador._id,
                transportistaId: null
            });
            await nuevoUsuario.save();
        }

        return res.status(201).json({
            message: "Generador y cuenta de acceso creados exitosamente",
            data: newGenerador,
            type: "Correcto"
        });

    } catch (error) {
        if (uploadedPublicIds.length > 0) {
            await Promise.allSettled(uploadedPublicIds.map((id) => deleteImage(id)));
        }
        return res.status(500).json({ message: error.message || "Error al crear el generador", type: "Error" });
    }
};

module.exports = postGenerador;