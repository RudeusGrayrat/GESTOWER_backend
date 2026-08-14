const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const bcrypt = require("bcrypt"); // Cambiado a 'bcrypt' para mantener consistencia con tus otros archivos
const jwt = require("jsonwebtoken");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");

const loginExternal = async (req, res) => {
    try {
        const { typeUser, ruc, password } = req.body;

        // 1. Validar campos requeridos
        if (!typeUser || !ruc || !password) {
            return res.status(400).json({ message: "Faltan datos requeridos", type: "Error" });
        }

        if (typeUser !== "GENERADOR" && typeUser !== "TRANSPORTISTA") {
            return res.status(400).json({ message: "Tipo de usuario no válido", type: "Error" });
        }

        // 2. El RUC se maneja como STRING para la búsqueda de credenciales en UserExternal
        const userAuth = await UserExternal.findOne({ ruc: String(ruc) });

        if (!userAuth) {
            return res.status(404).json({ message: "Usuario no registrado en el sistema", type: "Error" });
        }

        // 3. Validar contraseña contra el hash de la cuenta unificada
        const isMatch = await bcrypt.compare(password, userAuth.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Contraseña incorrecta", type: "Error" });
        }

        // 4. Verificar si la cuenta tiene permitido el rol con el que intenta ingresar
        if (!userAuth.roles.includes(typeUser)) {
            return res.status(403).json({
                message: `Su cuenta no cuenta con permisos de acceso como ${typeUser}`,
                type: "Error"
            });
        }

        const token = jwt.sign(
            {
                _id: userAuth._id,
                ruc: userAuth.ruc,
                role: "EXTERNAL",          // Identificador fijo para externos
                activeRole: typeUser,      // El rol seleccionado en el Dropdown ("GENERADOR" o "TRANSPORTISTA")
                // profileId: profileData._id,
                // razonSocial: profileData.razonSocial
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        return res.status(200).json({
            message: "Ingreso correcto",
            type: "Correcto",
            token,
            user: {
                ...userAuth.toObject(),
                password: undefined,
                ruc: userAuth.ruc,
                rolActivo: typeUser,
                _id: userAuth._id,
            }
        });

    } catch (error) {
        console.error("Error en loginExternal:", error);
        return res.status(500).json({ message: "Error interno del servidor", type: "Error" });
    }
};

module.exports = loginExternal;