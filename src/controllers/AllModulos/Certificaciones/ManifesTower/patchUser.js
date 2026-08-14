const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const bcrypt = require("bcrypt");

const patchUserExternal = async (req, res) => {
    try {
        const { userId, newPassword } = req.body;

        // Validar que realmente recibimos una nueva contraseña
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres" });
        }

        const findUser = await UserExternal.findById(userId);
        if (!findUser) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Hashing
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        findUser.password = hashedPassword;

        await findUser.save();
        res.json({ message: "Contraseña actualizada correctamente" });

    } catch (error) {
        console.error("Error en patchUserExternal:", error); // Útil para debug
        res.status(500).json({ message: "Error interno al actualizar la contraseña" });
    }
};

module.exports = patchUserExternal;