const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");

const patchManifiesto = async (req, res) => {
    try {
        const { manifiestoId } = req.params;
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
            aprobadoPor,
            modificadoPor,
            rechazadoPor,
            subsanadoPor,
            observacion,
            observadoPor,
        } = req.body;
        if (!manifiestoId) return res.status(400).json({ message: "ID del manifiesto es obligatorio", type: "Advertencia" });
        const findManifiesto = await Manifiesto.findById(manifiestoId);
        if (!findManifiesto) return res.status(404).json({ message: "Manifiesto no encontrado", type: "Error" });

        if (!["BORRADOR", "OBSERVADO"].includes(findManifiesto.estado)) {
            return res.status(400).json({ message: "Solo se pueden editar manifiestos en borrador u observados.", type: "Advertencia" });
        }
        findManifiesto.$where = { estado: findManifiesto.estado };
        if (estado && estado !== findManifiesto.estado) {
            return res.status(400).json({ message: "El estado se cambia mediante las acciones de envío y revisión.", type: "Advertencia" });
        }
        if (transporte?.fechaRecepcion) {
            const fecha = String(transporte.fechaRecepcion).slice(0, 10);
            const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
            if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha)) || fecha < hoy) {
                return res.status(400).json({ message: "La fecha de recepción debe ser hoy o una fecha futura.", type: "Advertencia" });
            }
        }
        const plano = (value) => value?.toObject ? value.toObject() : (value || {});

        if (año) findManifiesto.año = año;
        if (mes) findManifiesto.mes = mes;
        if (generadorId) findManifiesto.generadorId = generadorId;
        if (responsableGestion) findManifiesto.responsableGestion = {
            ...plano(findManifiesto.responsableGestion),
            ...responsableGestion
        }
        if (planta) {
            findManifiesto.planta = {
                ...plano(findManifiesto.planta),
                ...planta,
                ...(planta.coordenadasUtm ? { coordenadasUtm: {
                    ...plano(findManifiesto.planta?.coordenadasUtm),
                    ...planta.coordenadasUtm
                } } : {})
            }
        }
        if (residuo) findManifiesto.residuo = {
            ...plano(findManifiesto.residuo),
            ...residuo
        }
        if (peligrosidad) findManifiesto.peligrosidad = {
            ...plano(findManifiesto.peligrosidad),
            ...peligrosidad
        }
        if (transportistaId) findManifiesto.transportistaId = transportistaId;
        if (transporte) findManifiesto.transporte = {
            ...plano(findManifiesto.transporte),
            ...transporte
        }
        // Solo se conserva la elección de responsables: las firmas se registran
        // en las acciones de envío y aprobación, nunca desde el formulario.
        const entregaAnterior = plano(findManifiesto.referendoEntrega);
        findManifiesto.referendoEntrega = {
            referendo: false,
            generadorResponsableManejo: referendoEntrega?.generadorResponsableManejo ?? entregaAnterior.generadorResponsableManejo,
            responsableEors: referendoEntrega?.responsableEors ?? entregaAnterior.responsableEors,
        };
        findManifiesto.firmadoPorGenerador = undefined;
        findManifiesto.fechaEnvio = undefined;
        if (destinoFinal) findManifiesto.destinoFinal = {
            ...plano(findManifiesto.destinoFinal),
            ...destinoFinal
        }
        if (otrosManejos) findManifiesto.otrosManejos = {
            ...plano(findManifiesto.otrosManejos),
            ...otrosManejos
        }
        findManifiesto.modificadoPor = req.externalUser?._id || req.user?._id;
        await findManifiesto.save();

        return res.json({
            message: "Manifiesto actualizado exitosamente",
            data: findManifiesto,
            type: "Correcto"
        });



    } catch (error) {
        if (error.name === "DocumentNotFoundError") return res.status(409).json({ message: "El manifiesto cambió mientras lo editabas. Actualiza la lista e inténtalo nuevamente.", type: "Advertencia" });
        console.error("Error en patchManifiesto:", error);
        return res.status(500).json({ message: error.message || "Error al actualizar el manifiesto", type: "Error" });
    }
};

module.exports = patchManifiesto;
