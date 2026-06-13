const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const bcrypt = require("bcrypt"); // Cambiado a 'bcrypt' para mantener consistencia con tus otros archivos
const jwt = require("jsonwebtoken");

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

        // // 5. Mapeo del perfil operativo utilizando los IDs vinculados en la cuenta
        // let profileData = null;
        // if (typeUser === "GENERADOR") {
        //     profileData = await Generador.findById(userAuth.generadorId);
        // } else if (typeUser === "TRANSPORTISTA") {
        //     profileData = await Transportista.findById(userAuth.transportistaId);
        // }

        // // Validamos si la empresa existe en el módulo operativo y su estado
        // if (!profileData) {
        //     return res.status(404).json({
        //         message: `No se encontraron los datos operativos de la empresa como ${typeUser}`,
        //         type: "Error"
        //     });
        // }

        // if (profileData.estado === "INACTIVO" || profileData.estado === "SUSPENDIDO") {
        //     return res.status(403).json({
        //         message: `La empresa se encuentra actualmente con estado: ${profileData.estado}`,
        //         type: "Error"
        //     });
        // }

        // 6. Generación del Token firmado con el contexto dinámico del rol activo
        const token = jwt.sign(
            {
                id: userAuth._id,
                ruc: userAuth.ruc,
                role: "EXTERNAL",          // Identificador fijo para externos
                activeRole: typeUser,      // El rol seleccionado en el Dropdown ("GENERADOR" o "TRANSPORTISTA")
                // profileId: profileData._id,
                // razonSocial: profileData.razonSocial
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );
        console.log(`Usuario ${userAuth.ruc} ha iniciado sesión como ${typeUser}`);
        console.log("Payload del token:", {
            id: userAuth._id,
            ruc: userAuth.ruc,
            role: "EXTERNAL",
            activeRole: typeUser,
            // profileId: profileData._id,
            // razonSocial: profileData.razonSocial
        });
        return res.status(200).json({
            message: "Ingreso correcto",
            type: "Correcto",
            token,
            user: {
                ruc: userAuth.ruc,
                rolActivo: typeUser,
                // profileId: profileData._id,
                // razonSocial: profileData.razonSocial
            }
        });

    } catch (error) {
        console.error("Error en loginExternal:", error);
        return res.status(500).json({ message: "Error interno del servidor", type: "Error" });
    }
};

module.exports = loginExternal;