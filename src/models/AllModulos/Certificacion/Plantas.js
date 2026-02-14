const { default: mongoose } = require("mongoose");

const plantaSchema = mongoose.Schema(
    {
        generadorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Generador',
            required: true,
        },
        denominacion: {
            type: String,
            required: true,
        },
        // NUEVO CAMPO: Tipo de planta según el PDF
        tipoPlanta: {
            type: String,
            enum: ['PRINCIPAL', 'SECUNDARIA', 'OPERATIVA', 'ALMACENAMIENTO'],
            default: 'PRINCIPAL',
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
        coordenadasUtm: {
            norte: { type: String },
            este: { type: String },
            zona: { type: String },
        },
        actividadEconomica: {
            type: String, // CIIU
        },
        sector: {
            type: String,
        },
        responsableGestion: {
            nombre: { type: String, required: true },
            cargo: { type: String, required: true },
            dni: { type: String, required: true },
            correo: { type: String, required: true },
            telefono: { type: String, required: true },
        },
        // SECCIÓN 1.1.1: Instrumento de Gestión Ambiental
        tieneIga: {
            type: Boolean,
            default: false,
        },
        institucionApruebaIga: { // Renombrado de igaAprobadoPor para ser más específico
            type: String,
        },
        fechaAprobacionIga: {
            type: Date,
        },
        numeroResolucionIga: {
            type: String,
        },
        estado: {
            type: String,
            enum: ['ACTIVO', 'INACTIVO'],
            default: 'ACTIVO',
        },
    },
    { timestamps: true }
);

const Planta = mongoose.model("Planta", plantaSchema);
module.exports = Planta;