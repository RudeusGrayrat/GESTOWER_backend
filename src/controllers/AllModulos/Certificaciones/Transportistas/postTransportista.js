const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const cleanBase64 = require("../../../../utils/cleanBase64");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");
const bcrypt = require("bcrypt");

const postTransportista = async (req, res) => {
    // Array para almacenar los publicIds de las imágenes subidas y borrar en caso de rollback
    const uploadedPublicIds = [];

    try {
        const {
            razonSocial,
            ruc,
            registroEors,
            autorizacionMunicipal,
            documentoRuta,
            direccion,
            ubigeoId,
            correoElectronico,
            telefono,
            representanteLegal,
            responsableTecnico,
            contingencias,
            responsables,
            generadores,
            conductores,
            estado,
            crearUsuario // ⬅️ Flag recibido desde el frontend
        } = req.body;

        // 1. Validaciones de campos obligatorios
        if (!razonSocial || !ruc || !registroEors || !direccion || !ubigeoId || !correoElectronico || !telefono || !representanteLegal?.nombre || !representanteLegal?.dni) {
            return res.status(400).json({
                message: "Faltan datos requeridos para crear el transportista",
                type: "Error"
            });
        }

        // 2. Verificar duplicidad por RUC
        const findTransportista = await Transportista.findOne({ ruc });
        if (findTransportista) {
            return res.status(400).json({
                message: "El transportista con este RUC ya existe",
                type: "Error"
            });
        }

        // 3. Verificar existencia del Ubigeo
        const findUbigeo = await Ubigeo.findById(ubigeoId);
        if (!findUbigeo) {
            return res.status(404).json({
                message: "Ubigeo no encontrado",
                type: "Error"
            });
        }

        // 4. Subida de firmas de los Responsables a Cloudinary (Manejo de Base64)
        const responsablesConFirma = await Promise.all(
            (responsables || []).map(async (responsable) => {
                if (!responsable.firmaResponsable || responsable.firmaResponsable.startsWith("http")) {
                    return responsable;
                }

                const fileBuffer = Buffer.from(cleanBase64(responsable.firmaResponsable), "base64");
                const fileName = `firma_responsable_trans_${responsable.dni || Date.now()}`;
                const result = await uploadImage(fileBuffer, fileName);

                // Trackeamos el ID por si ocurre un error más adelante
                uploadedPublicIds.push(extractPublicId(result.secure_url));

                return { ...responsable, firmaResponsable: result.secure_url };
            })
        );

        // 5. Instancia y guardado del Transportista
        const newTransportista = new Transportista({
            razonSocial,
            ruc,
            registroEors,
            autorizacionMunicipal,
            documentoRuta,
            direccion,
            ubigeoId,
            correoElectronico,
            telefono,
            representanteLegal,
            responsableTecnico: responsableTecnico || {},
            contingencias: contingencias || {},
            responsables: responsablesConFirma, // 🌟 Guardamos las firmas con sus URLs de Cloudinary
            generadores: generadores || [],
            conductores: conductores || [],
            estado: estado || "ACTIVO",
        });

        await newTransportista.save();

        // 6. LÓGICA CONDICIONAL DE USUARIO (UserExternal)
        if (crearUsuario === true) {
            const usuarioExistente = await UserExternal.findOne({ ruc });
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(ruc, salt); // El RUC será su contraseña por defecto

            if (usuarioExistente) {
                // Si la empresa ya tenía cuenta (por ejemplo, como Generador), le añadimos el rol de TRANSPORTISTA
                if (!usuarioExistente.roles.includes("TRANSPORTISTA")) {
                    usuarioExistente.roles.push("TRANSPORTISTA");
                }
                usuarioExistente.transportistaId = newTransportista._id;
                await usuarioExistente.save();
            } else {
                // Si es un ruc completamente nuevo en el ecosistema
                const nuevoUsuario = new UserExternal({
                    ruc,
                    password: hashedPassword,
                    roles: ["TRANSPORTISTA"],
                    transportistaId: newTransportista._id,
                    generadorId: null
                });
                await nuevoUsuario.save();
            }
        }

        return res.status(201).json({
            message: crearUsuario === true
                ? "Transportista y cuenta de acceso creados exitosamente"
                : "Transportista creado exitosamente (Sin cuenta de usuario)",
            data: newTransportista,
            type: "Correcto"
        });

    } catch (error) {
        // 7. ROLLBACK DE IMÁGENES: Si la base de datos falla, borramos las firmas de Cloudinary para no dejar basura
        if (uploadedPublicIds.length > 0) {
            await Promise.allSettled(uploadedPublicIds.map((id) => deleteImage(id)));
        }
        console.error("Error al crear el transportista:", error);
        return res.status(500).json({
            message: error.message || "Error al crear el transportista",
            type: "Error"
        });
    }
};

module.exports = postTransportista;