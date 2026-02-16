const { default: mongoose } = require("mongoose");

const manifiestoSchema = mongoose.Schema(
    {
        // Identificación única
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

        // Estado del manifiesto
        estado: {
            type: String,
            enum: ['REGISTRADO', 'EN_TRANSPORTE', 'RECIBIDO', 'PROCESADO', 'CERRADO', 'ANULADO'],
            default: 'REGISTRADO',
        },

        // Relaciones principales
        generadorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Generador',
            required: true,
        },
        plantaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Planta',
            required: true, // La planta específica que generó el residuo
        },
        transportistaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Transportista',
            required: true,
        },
        destinoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Destino',
            required: true,
        },

        // SECCIÓN 2: DATOS DEL RESIDUO PELIGROSO MANEJADO
        residuo: {
            // 2.1 CARACTERÍSTICAS DEL RESIDUO
            descripcion: { type: String, required: true },
            cantidadTotal: { type: Number, required: true }, // en toneladas
            estadoFisico: {
                type: String,
                enum: ['SOLIDO', 'SEMISOLIDO', 'LIQUIDO', 'GAS'],
                required: true,
            },
            // 2.2 CARACTERÍSTICAS DEL RECIPIENTE
            tipoRecipiente: { type: String },
            materialRecipiente: { type: String },
            numeroRecipientes: { type: Number, default: 1 },
            // Código de clasificación Convenio de Basilea
            codigoBasilea: {
                type: String,
                enum: ['A1', 'A2', 'A3', 'A4']
            },
            subcodigoBasilea: { type: String },
            informacionAdicional: { type: String },
        },

        // Características de peligrosidad (Anexo IV)
        peligrosidad: {
            explosivos: { type: Boolean, default: false },
            oxidantes: { type: Boolean, default: false },
            gasesToxicos: { type: Boolean, default: false }, // Liberación de gases tóxicos
            liquidosInflamables: { type: Boolean, default: false },
            peroxidosOrganicos: { type: Boolean, default: false },
            toxicosAgudos: { type: Boolean, default: false }, // Tóxicos (venenosos) agudos
            toxicosCronicos: { type: Boolean, default: false }, // Sustancias tóxicas (efectos retardados o crónicos)
            solidosInflamables: { type: Boolean, default: false },
            ecotoxicos: { type: Boolean, default: false },
            combustionEspontanea: { type: Boolean, default: false },
            sustanciasInfecciosas: { type: Boolean, default: false },
            sustanciasSecundarias: { type: Boolean, default: false }, // Dan origen a otra sustancia
            gasesInflamablesAgua: { type: Boolean, default: false }, // Emiten gases inflamables con agua
            corrosivos: { type: Boolean, default: false },
            otros: { type: String },
        },

        // SECCIÓN 3.1: EO-RS DE RECOLECCIÓN Y TRANSPORTE (Datos específicos del viaje)
        transporte: {
            // Datos del vehículo y conductor (movidos desde Transportista.js)
            vehiculo: {
                tipo: { type: String },
                placa: { type: String }
            },
            conductor: {
                nombre: { type: String }
            },
            fechaRecepcion: { type: Date },
            cantidadRecibida: { type: Number }, // en toneladas
            observaciones: { type: String },
        },

        // REFERENDO - ENTREGA (Generador a Transportista)
        referendoEntrega: {
            firmaGenerador: { type: String }, // Base64 o path
            nombreGenerador: { type: String }, // Nombres y apellidos del responsable del generador
            firmaTransportista: { type: String },
            nombreTransportista: { type: String }, // Nombres y apellidos del responsable del transportista (conductor)
            dniTransportista: { type: String },
            cargoTransportista: { type: String },
            fechaHoraEntrega: { type: Date },
        },

        // SECCIÓN 3.2: EO-RS DEL DESTINO FINAL
        destinoFinal: {
            tipoManejo: {
                type: String,
                enum: ['TRATAMIENTO', 'VALORIZACION', 'DISPOSICION_FINAL'],
            },
            cantidadEntregada: { type: Number }, // en toneladas
            observaciones: { type: String },
        },

        // REFERENDO - RECEPCIÓN (Transportista a Destino)
        referendoRecepcion: {
            firmaDestino: { type: String },
            nombreDestino: { type: String }, // Nombres y apellidos del responsable del destino final
            dniDestino: { type: String },
            cargoDestino: { type: String },
            fechaHoraRecepcion: { type: Date },
            cantidadEntregada: { type: Number }, // en toneladas (coincide con destinoFinal.cantidadEntregada)
            observacionesDestino: { type: String },
        },

        // SECCIÓN 3.3: OTROS (Comercialización, Exportación, etc.)
        otrosManejos: [{
            tipo: {
                type: String,
                enum: ['COMERCIALIZACION', 'EXPORTACION', 'OTROS']
            },
            razonSocialReceptor: { type: String },
            rucReceptor: { type: String },
            correoElectronico: { type: String },
            telefono: { type: String },
            tipoManejoRealizado: { type: String },
            direccionDestino: { type: String }, // País si es exportación
            documentoAprueba: { type: String },
        }],

        // SECCIÓN 4.1: PLAN DE CONTINGENCIAS
        contingencias: {
            derrame: { type: String },
            infiltracion: { type: String },
            incendio: { type: String },
            explosion: { type: String },
            otrosAccidentes: { type: String },
        },

        // SECCIÓN 4.2: DEVOLUCIÓN DEL MANIFIESTO AL GENERADOR
        devolucionManifiesto: {
            // EO-RS que entrega el manifiesto
            representanteEors: {
                nombre: { type: String },
                firma: { type: String },
                dni: { type: String },
                cargo: { type: String },
            },
            // Generador que recibe el manifiesto
            responsableGenerador: {
                nombre: { type: String },
                firma: { type: String },
                dni: { type: String },
                cargo: { type: String },
                fechaRecepcion: { type: Date },
                horaRecepcion: { type: String },
            },
        },

        // Auditoría
        creadoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
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