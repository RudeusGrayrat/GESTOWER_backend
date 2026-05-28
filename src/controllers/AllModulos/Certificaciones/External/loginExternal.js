const UserExternal = require("../../../../models/AllModulos/Certificacion/UserExternal");
const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const loginExternal = async (req, res) => {
    try {
        const { typeUser, username, password } = req.body;

        // 1. Validar campos requeridos por tu Front con React Hook Form
        if (!typeUser || !username || !password) {
            return res.status(400).json({ message: "Faltan datos requeridos", type: "Error" });
        }

        const rucNumber = Number(username);

        // 2. Buscar las credenciales por RUC
        const userAuth = await UserExternal.findOne({ ruc: rucNumber });
        if (!userAuth || userAuth.estado === "INACTIVO") {
            return res.status(404).json({ message: "Usuario no registrado o inactivo", type: "Error" });
        }

        // 3. Verificar si tiene permitido el rol con el que intenta ingresar
        if (!userAuth.roles.includes(typeUser)) {
            return res.status(403).json({
                message: `Su RUC no cuenta con permisos de acceso como ${typeUser}`,
                type: "Error"
            });
        }

        // 4. Validar contraseña
        const isMatch = await bcrypt.compare(password, userAuth.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Contraseña incorrecta", type: "Error" });
        }

        // 5. Mapeo dinámico del perfil operativo según la elección del Dropdown
        let profileData = null;
        if (typeUser === "GENERADOR") {
            profileData = await Generador.findOne({ ruc: rucNumber });
        } else if (typeUser === "TRANSPORTISTA") {
            profileData = await Transportista.findOne({ ruc: rucNumber });
        }

        if (!profileData) {
            return res.status(404).json({
                message: `No se encontraron los datos operativos de la empresa como ${typeUser} en Gestower`,
                type: "Error"
            });
        }

        // 6. Generación del Token firmado incluyendo los contextos dinámicos
        const token = jwt.sign(
            {
                id: userAuth._id,
                ruc: userAuth.ruc,
                role: "EXTERNAL",          // fijo para externos
                activeRole: typeUser,      // "GENERADOR" o "TRANSPORTISTA"
                profileId: profileData._id,
                razonSocial: profileData.razonSocial
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        return res.status(200).json({
            message: "Ingreso correcto",
            type: "Correcto",
            token,
            user: {
                ruc: userAuth.ruc,
                rolActivo: typeUser,
                profileId: profileData._id,
                razonSocial: profileData.razonSocial
            }
        });

    } catch (error) {
        console.error("Error en loginExternal:", error);
        return res.status(500).json({ message: "Error interno del servidor", type: "Error" });
    }
};

module.exports = { loginExternal };