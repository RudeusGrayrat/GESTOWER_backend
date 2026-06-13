const mongoose = require("mongoose");

const userExternalSchema = new mongoose.Schema(
    {
        ruc: {
            type: String,
            required: true,
            unique: true, // Un solo registro de autenticación por RUC
        },
        password: {
            type: String,
            required: true,
        },
        roles: [
            {
                type: String,
                enum: ["GENERADOR", "TRANSPORTISTA", "ADMIN"],
                required: true,
            }
        ],
        generadorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Generador",
        },
        transportistaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Transportista",
        },
        estado: {
            type: String,
            enum: ["ACTIVO", "INACTIVO"],
            default: "ACTIVO",
        }
    },
    { timestamps: true }
);

// Método automático para no retornar el password en las consultas JSON
userExternalSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

const UserExternal = mongoose.model("UserExternal", userExternalSchema);
module.exports = UserExternal;