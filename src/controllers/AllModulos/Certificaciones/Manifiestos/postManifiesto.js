const Destino = require("../../../../models/AllModulos/Certificacion/Destino");
const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const generarCorrelativaManifiesto = require("./correlativaManifiesto");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");

// Una fecha de calendario no representa un instante. Guardarla al mediodía UTC
// evita que 2026-11-04 se muestre como 03/11 en America/Lima.
const fechaCalendario = (valor) => {
    const [anio, mes, dia] = String(valor || "").slice(0, 10).split("-").map(Number);
    if (!anio || !mes || !dia) return null;
    const fecha = new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const fechaLimaISO = (fecha = new Date()) => {
    const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(fecha);
    const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value;
    return `${valor("year")}-${valor("month")}-${valor("day")}`;
};

const postManifiesto = async (req, res) => {
    try {
        const {
            año,
            mes,
            generadorId,
            responsableGestion,
            planta,
            residuo,
            peligrosidad,
            transportistaId,
            transporte,
            referendoEntrega,
            destinoId,
            destinoFinal,
            referendoRecepcion,
            otrosManejos,
            otrasObligaciones,
            estado,
            creadoPor
        } = req.body;

        // Validaciones básicas (coinciden con los * del front)
        if (!año || !mes || !generadorId || !planta || !transportistaId) {
            return res.status(400).json({
                message: "Faltan datos requeridos: año, mes, generador, planta y transportista",
                type: "Error"
            });
        }

        if (!residuo?.descripcion || !residuo?.cantidadTotal || !residuo?.estadoFisico || !residuo?.codigoBasilea) {
            return res.status(400).json({
                message: "Complete los datos del residuo (descripción, cantidad, estado físico, código Basilea)",
                type: "Error"
            });
        }

        if (!transporte?.fechaRecepcion || !transporte?.cantidadRecibida || !transporte?.tipoVehiculo || !transporte?.placaVehiculo) {
            return res.status(400).json({
                message: "Complete los datos del transporte (fecha, cantidad, tipo y placa del vehículo)",
                type: "Error"
            });
        }

        const fechaRecepcion = fechaCalendario(transporte.fechaRecepcion);
        const hoyLima = fechaLimaISO();
        const hoy = fechaCalendario(hoyLima);
        if (!fechaRecepcion || !hoy || fechaRecepcion < hoy) {
            return res.status(400).json({
                message: "La fecha de recepción debe ser hoy o una fecha futura",
                type: "Error"
            });
        }

        // Verificar existencia de entidades relacionadas
        const [generador, transportista, destinoPredeterminado] = await Promise.all([
            Generador.findById(generadorId),
            Transportista.findById(transportistaId),
            // Tower es el destino único actual. Al incorporar sedes, esta selección
            // deberá sustituirse por una regla explícita de sede autorizada.
            Destino.findOne().sort({ createdAt: 1 }),
        ]);

        if (!generador) return res.status(404).json({ message: "Generador no encontrado", type: "Error" });
        if (!transportista) return res.status(404).json({ message: "Transportista no encontrado", type: "Error" });
        if (!destinoPredeterminado) return res.status(404).json({ message: "No existe un destino final configurado", type: "Error" });

        // Verificar que la planta pertenezca al generador
        // if (planta.generadorId?.toString() !== generadorId) {
        //     return res.status(400).json({
        //         message: "La planta no pertenece al generador especificado",
        //         type: "Error"
        //     });
        // }

        // Generar número de manifiesto correlativo
        const numeroManifiesto = await generarCorrelativaManifiesto(año);

        // Crear el manifiesto con la estructura completa del front
        const newManifiesto = new Manifiesto({
            numeroManifiesto,
            año,
            mes,
            generadorId,
            responsableGestion,
            planta,
            transportistaId,
            destinoId: destinoPredeterminado._id,
            residuo,
            peligrosidad: peligrosidad || {},
            transporte: { ...transporte, fechaRecepcion },
            destinoFinal: {},
            otrosManejos: {},
            // El refrendo de entrega siempre corresponde a un manifiesto. Las
            // firmas se inmovilizan al enviarlo, nunca durante el borrador.
            referendoEntrega: { referendo: true, generadorResponsableManejo: referendoEntrega?.generadorResponsableManejo, responsableEors: referendoEntrega?.responsableEors },
            referendoRecepcion: { referendo: false },
            otrasObligaciones: {},
            estado: "BORRADOR",
            creadoPor: req.externalUser?._id || req.user?._id
        });

        await newManifiesto.save();

        try {
            await NotificationService.send(req.app.get("io"), {
                type: "SUBMODULE",
                title: `Nuevo Manifiesto Creado: ${newManifiesto.numeroManifiesto}`,
                message: `Se creó el manifiesto ${newManifiesto.numeroManifiesto} para el generador ${generador.razonSocial} y el transportista ${transportista.razonSocial}.`,
                creator: { model: "System" },
                scope: { submoduleName: "MANIFIESTOS", moduleName: "CERTIFICACIONES" },
                entity: { id: newManifiesto._id, model: "Manifiesto" }
            });
        } catch (notificationError) {
            console.error("No se pudo notificar la creación del manifiesto:", notificationError);
        }

        // Poblar datos para la respuesta
        const manifiestoCompleto = await Manifiesto.findById(newManifiesto._id)
            .populate('generadorId')
            .populate('transportistaId')
            .populate('destinoId')
            .populate('creadoPor', 'nombre email');

        return res.status(201).json({
            message: "Manifiesto creado exitosamente",
            type: "Correcto",
            data: manifiestoCompleto
        });
    } catch (error) {
        console.error("Error en postManifiesto:", error);
        return res.status(500).json({
            message: error.message || "Error al crear el manifiesto",
            type: "Error"
        });
    }
};

module.exports = postManifiesto;
