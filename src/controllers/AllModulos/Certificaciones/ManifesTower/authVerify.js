const jwt = require("jsonwebtoken");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const { JWT_SECRET } = process.env;

const ManifestVerifyToken = async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "No hay token" });
    }

    try {
        // 1. Verificar y decodificar el token
        const decoded = jwt.verify(token, JWT_SECRET);
        // 2. Buscar al usuario por su ID (el que guardaste en el token)
        const userFound = await UserExternal.findById(decoded._id);
        if (!userFound) {
            return res.status(401).json({ message: "Usuario no encontrado" });
        }

        // 3. Limpiar datos sensibles
        const userData = userFound.toObject();
        delete userData.password;

        // 4. Devolver usuario + el rol activo que estaba en el token
        return res.status(200).json({
            user: userData,
            activeRole: decoded.activeRole   // ← clave: extraer del token
        });

    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expirado" });
        }
        return res.status(403).json({ message: "Token no válido" });
    }
};

module.exports = ManifestVerifyToken;