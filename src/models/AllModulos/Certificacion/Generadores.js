const { default: mongoose } = require("mongoose");

const generadorSchema = mongoose.Schema(
    {
        razonSocial: {
            type: String,
            required: true,
        },
        ruc: {
            type: Number,
            required: true,
            unique: true,
        },
        correoElectronico: {
            type: String,
            required: true,
        },
        direccion: {
            type: String,
            required: true,
        },
        telefono: {
            type: String,
            required: true,
        },
        representanteLegal: {
            type: String,
            required: true,
        },
        dniRepresentante: {
            type: String,
            required: true,
        },
        estado: {
            type: String,
            enum: ['ACTIVO', 'INACTIVO', 'SUSPENDIDO'],
            default: 'ACTIVO',
        },
    },
    { timestamps: true }
);

const Generador = mongoose.model("Generador", generadorSchema);
module.exports = Generador;
