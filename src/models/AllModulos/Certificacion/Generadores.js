const { default: mongoose } = require("mongoose");

const generadorSchema = mongoose.Schema(
    {
        razonSocial: {
            type: String,
            required: true,
        },
        ruc: {
            type: String,
            required: true,
            unique: true,
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
            type: String,
            required: true,
        },
        dniRepresentante: {
            type: String,
            required: true,
        },
        plantas: [{
            denominacion: { type: String, required: true },
            tipoPlanta: { type: String, required: true },
            direccion: { type: String, required: true },
            ubigeoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ubigeo', required: true },
            coordenadasUtm: { norte: { type: String }, este: { type: String }, zona: { type: String } },
            actividadEconomica: { type: String, required: true },
            sector: { type: String },
            tieneIga: { type: Boolean, default: false },
            institucionApruebaIga: { type: String },
            fechaAprobacionIga: { type: String },
            numeroResolucionIga: { type: String },
        }],
        responsablesTecnicos: [{
            nombreResponsable: { type: String, required: true },
            dniResponsable: { type: String, required: true },
            cargoResponsable: { type: String, required: true },
            correoResponsable: { type: String },
            telefonoResponsable: { type: String },
            firmaResponsable: { type: String },
        }],
        estado: {
            type: String,
            enum: ["ACTIVO", "INACTIVO", "SUSPENDIDO"],
            default: "ACTIVO",
        },
    },
    { timestamps: true }
);

const Generador = mongoose.model("Generador", generadorSchema);
module.exports = Generador;
