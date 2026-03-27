const { default: mongoose } = require("mongoose");

const transportistaSchema = mongoose.Schema(
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
        registroEors: {
            type: String,
            required: true,
        },
        autorizacionMunicipal: {
            type: String,
        },
        documentoRuta: {
            type: String,
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
        contingencias: {
            derrame: { type: String },
            infiltracion: { type: String },
            incendio: { type: String },
            explosion: { type: String },
            otrosAccidentes: { type: String },
        },
        responsableTecnico: [
            {
                nombre: { type: String },
                dni: { type: String },
                cargo: { type: String },
                numeroColegiatura: { type: String },
            }
        ],
        generadores: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Generador',
            }
        ],
        conductores: [
            {
                nombre: { type: String },
                licencia: { type: String },
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

const Transportista = mongoose.model("Transportista", transportistaSchema);
module.exports = Transportista;