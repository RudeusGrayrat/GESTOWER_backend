const { default: mongoose } = require("mongoose");

const destinoSchema = mongoose.Schema(
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
        codigoRegistroEors: {
            type: String,
            required: true,
        },
        autorizacionMunicipal: {
            type: String,
        },
        tipoManejo: {
            type: String,
            enum: ['TRATAMIENTO', 'VALORIZACION', 'DISPOSICION_FINAL'],
            required: true,
        },
        direccion: {
            type: String,
            required: true,
        },
        ubigeoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Ubigeo',
            required: true,
        },
        correoElectronico: {
            type: String,
            required: true,
        },
        telefono: {
            type: String,
            required: true,
        },
        representanteLegal: {
            nombre: { type: String, required: true },
            dni: { type: String, required: true },
        },
        responsableTecnico: {
            nombre: { type: String },
            numeroColegiatura: { type: String },
        },
        responsables: [
            {
                nombre: { type: String },
                dni: { type: String },
                cargo: { type: String },
                firmaResponsable: { type: String },
            }
        ],
        estado: {
            type: String,
            enum: ['ACTIVO', 'INACTIVO', 'SUSPENDIDO'],
            default: 'ACTIVO',
        },
    },
    { timestamps: true }
);

const Destino = mongoose.model("Destino", destinoSchema);
module.exports = Destino;