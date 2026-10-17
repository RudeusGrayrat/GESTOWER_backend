const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const bcrypt = require("bcrypt");

const patchUserExternal = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validar que realmente recibimos una nueva contraseña
        if (typeof currentPassword !== "string" || !currentPassword || Buffer.byteLength(currentPassword, "utf8") > 72 || typeof newPassword !== "string" || newPassword.length < 12 || Buffer.byteLength(newPassword, "utf8") > 72) {
            return res.status(400).json({ message: "Ingresa la contraseña actual y una nueva de al menos 12 caracteres y máximo 72 bytes." });
        }

        const findUser = await UserExternal.findById(req.externalUser._id);
        if (!findUser) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        if (findUser.estado !== "ACTIVO" || !await bcrypt.compare(currentPassword, findUser.password)) return res.status(403).json({ message: "No se pudo verificar la contraseña actual." });

        // Hashing
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        const result = await UserExternal.updateOne({ _id: findUser._id, password: findUser.password, estado: "ACTIVO" }, { $set: { password: hashedPassword } });
        if (!result.matchedCount) return res.status(409).json({ message: "La contraseña cambió; vuelve a iniciar sesión." });
        res.json({ message: "Contraseña actualizada correctamente" });

    } catch (error) {
        console.error("Error en patchUserExternal:", error); // Útil para debug
        res.status(500).json({ message: "Error interno al actualizar la contraseña" });
    }
};

module.exports = patchUserExternal;
