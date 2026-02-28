const { default: mongoose } = require("mongoose");

const manifiestoSchema = mongoose.Schema(
    {
        // Identificación única (autogenerado en frontend)
        numeroManifiesto: {
            type: String,
            required: true,
            unique: true,
        },
        año: {
            type: Number,
            required: true,
        },
        mes: {
            type: Number,
            required: true,
        },

        // Estado del manifiesto - AGREGAR MÁS ESTADOS para el flujo de trabajo
        estado: {
            type: String,
            enum: ["PENDIENTE", "EN_REVISION", "OBSERVADO", "APROBADO", "RECHAZADO", "COMPLETADO", "ANULADO"],
            default: 'PENDIENTE',
        },

        // Paso 1 - Relaciones principales
        generadorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Generador',
            required: true,
        },
        plantaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Planta',
            required: true,
        },
        servicioTransporte: {
            type: String,
            enum: ['SERVICIO TOWER', 'SERVICIO EO'], // Agregar enum
            default: 'SERVICIO TOWER'
        },

        // Paso 4 - Transportista
        transportistaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Transportista',
            required: true,
        },

        // Paso 5 - Destino
        destinoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Destino',
            required: true,
        },
        tipoManejo: {
            type: String,
        },
        comercializable: {
            type: Boolean,
            default: false,
        },

        // SECCIÓN 2: DATOS DEL RESIDUO PELIGROSO MANEJADO (Paso 2)
        residuo: {
            descripcion: { type: String, required: true },
            cantidadTotal: { type: Number, required: true },
            estadoFisico: {
                type: String,
                enum: ['SOLIDO', 'SEMISOLIDO', 'LIQUIDO', 'GAS'],
                required: true,
            },
            tipoRecipiente: { type: String, required: true },
            materialRecipiente: { type: String, required: true },
            numeroRecipientes: { type: Number, default: 1 },
            codigoBasilea: { type: String, required: true },
            subcodigoBasilea: { type: String },
            informacionAdicional: { type: String },
        },

        // SECCIÓN 3: CARACTERÍSTICAS DE PELIGROSIDAD (Paso 3)
        peligrosidad: {
            explosivos: { type: Boolean, default: false },
            oxidantes: { type: Boolean, default: false },
            gasesToxicos: { type: Boolean, default: false },
            liquidosInflamables: { type: Boolean, default: false },
            peroxidosOrganicos: { type: Boolean, default: false },
            toxicosCronicos: { type: Boolean, default: false },
            solidosInflamables: { type: Boolean, default: false },
            toxicosAgudos: { type: Boolean, default: false },
            ecotoxicos: { type: Boolean, default: false },
            combustionEspontanea: { type: Boolean, default: false },
            sustanciasInfecciosas: { type: Boolean, default: false },
            sustanciasSecundarias: { type: Boolean, default: false },
            gasesInflamablesAgua: { type: Boolean, default: false },
            corrosivos: { type: Boolean, default: false },
            otros: { type: String, default: '' },
        },

        // SECCIÓN 3.1: TRANSPORTE (Paso 4 - datos específicos del viaje)
        transporte: {
            nombreConductor: { type: String, required: true },
            tipoVehiculo: { type: String, required: true },
            placaVehiculo: { type: String, required: true },
            fechaRecepcion: { type: Date, required: true },
            cantidadRecibida: { type: Number, required: true },
            observaciones: { type: String },
        },

        // SECCIÓN 3.2: DESTINO FINAL (Paso 5)
        destinoFinal: {
            cantidadEntregada: { type: Number, required: true },
            observaciones: { type: String },
        },

        // SECCIÓN 3.3: OTROS MANEJOS (Paso 5)
        otrosManejos: {
            razonSocialReceptor: { type: String },
            rucReceptor: { type: String }, // CAMBIAR a String (los RUC pueden tener ceros a la izquierda)
            correoReceptor: { type: String },
            telefonoReceptor: { type: String },
            comercializacion: { type: Boolean, default: false },
            exportacion: { type: Boolean, default: false },
            otro: { type: Boolean, default: false },
            tipoManejo: { type: String },
            direccionDestino: { type: String },
            documentoAprueba: { type: String },
        },

        // SECCIÓN 4.2: DEVOLUCIÓN DEL MANIFIESTO (Paso 5)
        devolucionManifiesto: {
            representanteEors: {
                nombre: { type: String },
                dni: { type: String },
                cargo: { type: String },
                firma: { type: String },
            },
            responsableGenerador: {
                nombre: { type: String },
                dni: { type: String },
                cargo: { type: String },
                firma: { type: String },
                fechaDevolucion: { type: Date },
                horaDevolucion: { type: String },
            }
        },

        // PASO 7: REFRENDOS (Firmas)
        // referendoEntrega: {
        //     firmaGenerador: { type: String },
        //     nombreGenerador: { type: String, required: true },
        //     firmaTransportista: { type: String },
        //     nombreTransportista: { type: String, required: true },
        //     dniTransportista: { type: String, required: true },
        //     cargoTransportista: { type: String, required: true },
        //     fechaHora: { type: Date, required: true },
        // },
        // referendoRecepcion: {
        //     firmaDestino: { type: String },
        //     nombreDestino: { type: String, required: true },
        //     dniDestino: { type: String, required: true },
        //     cargoDestino: { type: String, required: true },
        //     fechaHora: { type: Date, required: true },
        // },

        // Auditoría
        creadoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
        },
        modificadoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
        },
    },
    { timestamps: true }
);

const Manifiesto = mongoose.model("Manifiesto", manifiestoSchema);
module.exports = Manifiesto;