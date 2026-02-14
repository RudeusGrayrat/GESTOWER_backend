const { default: mongoose } = require("mongoose");

const ubigeoSchema = mongoose.Schema(
    {
        codigo: {
            type: String,
            required: true,
            unique: true,
        },
        departamento: {
            type: String,
            required: true,
        },
        provincia: {
            type: String,
            required: true,
        },
        distrito: {
            type: String,
            required: true,
        },
        estado: {
            type: String,
            enum: ['ACTIVO', 'INACTIVO'],
            default: 'ACTIVO',
        },
    },
    { timestamps: true }
);

const Ubigeo = mongoose.model("Ubigeo", ubigeoSchema);
module.exports = Ubigeo;