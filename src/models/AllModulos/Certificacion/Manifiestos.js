const { default: mongoose } = require("mongoose")

const manifiestoSchema = new mongoose.Schema(
    {
        numeroManifiesto: { type: String, required: true, unique: true },
        año: { type: Number, required: true },
        mes: { type: String, required: true },
        estado: { type: String, enum: ["PENDIENTE", "EN REVISION", "OBSERVADO", "SUBSANADO", "APROBADO", "RECHAZADO"], default: 'PENDIENTE' },
        // Relaciones (IDs)
        generadorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Generador', required: true },
        responsableGestion: {
            nombreResponsable: { type: String, required: true },
            dniResponsable: { type: String, required: true },
            cargoResponsable: { type: String, required: true },
            correoResponsable: { type: String },
            telefonoResponsable: { type: String },
            firmaResponsable: { type: String },
        },
        planta: {
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
        },
        transportistaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transportista', required: true },
        destinoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Destino', required: true },

        // Sección 2: Residuo
        residuo: {
            descripcion: { type: String, required: true },
            cantidadTotal: { type: Number, required: true },
            estadoFisico: { type: String, enum: ['SOLIDO', 'SEMISOLIDO', 'LIQUIDO', 'GAS'], required: true },
            tipoRecipiente: { type: String },
            materialRecipiente: { type: String },
            numeroRecipientes: { type: Number, default: 1 },
            codigoBasilea: { type: String },
            subcodigoBasilea: { type: String },
            informacionAdicional: { type: String }
        },

        // Sección 3: Peligrosidad
        peligrosidad: {
            explosivos: Boolean,
            oxidantes: Boolean,
            gasesToxicos: Boolean,
            liquidosInflamables: Boolean,
            peroxidosOrganicos: Boolean,
            toxicosCronicos: Boolean,
            solidosInflamables: Boolean,
            toxicosAgudos: Boolean,
            ecotoxicos: Boolean,
            combustionEspontanea: Boolean,
            sustanciasInfecciosas: Boolean,
            sustanciasSecundarias: Boolean,
            gasesInflamablesAgua: Boolean,
            corrosivos: Boolean,
            otros: String
        },

        // Sección 4: Transporte (incluye datos del viaje y referendo de entrega)
        transporte: {
            // datos del viaje
            nombreConductor: { type: String },
            tipoVehiculo: { type: String },
            placaVehiculo: { type: String },
            fechaRecepcion: { type: Date },
            horaRecepcion: { type: String },
            cantidadRecibida: { type: Number },
            observaciones: { type: String },
            // referendo de entrega
        },
        referendoEntrega: {
            referendo: { type: Boolean, default: false },
            generadorResponsableManejo: String,
            firmaGenerador: String,
            responsableEors: String,
            firmaResponsableEors: String,
            dniResponsableEors: String,
            cargoResponsableEors: String,
            fechaHora: Date
        },

        // Sección 5: Destino final
        destinoFinal: {
            tipoManejo: { type: String },
            cantidadEntregada: { type: Number },
            observaciones: { type: String },
        },
        referendoRecepcion: {
            referendo: { type: Boolean, default: false },
            responsableEorsDestino: String,  // unificar criterio
            firmaGenerador: String,
            dniResponsableEorsDestino: String,
            cargoResponsableEorsDestino: String,
            fechaReferendo: Date,
            horaReferendo: String
        },

        // Sección 5.3: Otros manejos
        otrosManejos: {
            razonSocialReceptor: String,
            rucReceptor: String,
            correoReceptor: String,
            telefonoReceptor: String,
            comercializacion: { type: Boolean, default: false },
            exportacion: { type: Boolean, default: false },
            otro: { type: Boolean, default: false },
            tipoManejo: String,
            direccionDestino: String,
            documentoAprueba: String
        },

        // Sección 6: Otras obligaciones (devolución del manifiesto)
        otrasObligaciones: {
            representanteEors: String,
            cargoRepresentanteEors: String,
            dniRepresentanteEors: String,
            firmaRepresentanteEors: String,
            generadorResponsableManejo: String,
            cargoGeneradorResponsableManejo: String,
            dniGeneradorResponsableManejo: String,
            firmaGeneradorResponsableManejo: String,
            fecha: Date,
            hora: String
        },

        // Metadatos
        creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
        modificadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }

    }, {
    timestamps: true
});

const Manifiesto = mongoose.model("Manifiesto", manifiestoSchema);
module.exports = Manifiesto;