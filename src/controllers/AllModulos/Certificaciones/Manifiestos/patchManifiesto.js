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

        // Solo permitir actualización si el estado es "PENDIENTE"
        if (findManifiesto.estado !== "PENDIENTE") {
            return res.status(400).json({ message: "Solo se pueden editar manifiestos en estado PENDIENTE", type: "Advertencia" });
        }
        if (estado && !["PENDIENTE", "APROBADO", "RECHAZADO", "SUBSANADO"].includes(estado)) {
            return res.status(400).json({
                message: "Estado inválido. Los estados permitidos son: PENDIENTE, APROBADO, RECHAZADO, SUBSANADO",
            })
        }
        if (estado === "APROBADO" && !aprobadoPor) {
            return res.status(400).json({
                message: "El campo aprobadoPor es obligatorio cuando el estado es APROBADO",
                type: "Error"
            });
        }
        if (estado === "RECHAZADO" && !rechazadoPor) {
            return res.status(400).json({
                message: "El campo rechazadoPor es obligatorio cuando el estado es RECHAZADO",
                type: "Error"
            });
        }
        if (estado === "SUBSANADO" && !subsanadoPor) {
            return res.status(400).json({
                message: "El campo subsanadoPor es obligatorio cuando el estado es SUBSANADO",
                type: "Error"
            });
        }

        if (año) findManifiesto.año = año;
        if (mes) findManifiesto.mes = mes;
        if (generadorId) findManifiesto.generadorId = generadorId;
        if (responsableGestion) findManifiesto.responsableGestion = {
            ...findManifiesto.responsableGestion,
            ...responsableGestion
        }
        if (planta) {
            console.log("Planta actual:", findManifiesto.planta);
            console.log("Datos recibidos para planta:", planta);
            findManifiesto.planta = {
                ...findManifiesto.planta,
                ...planta
            }
        }
        if (residuo) findManifiesto.residuo = {
            ...findManifiesto.residuo,
            ...residuo
        }
        if (peligrosidad) findManifiesto.peligrosidad = {
            ...findManifiesto.peligrosidad,
            ...peligrosidad
        }
        if (transportistaId) findManifiesto.transportistaId = transportistaId;
        if (transporte) findManifiesto.transporte = {
            ...findManifiesto.transporte,
            ...transporte
        }
        if (referendoEntrega) findManifiesto.referendoEntrega = {
            ...findManifiesto.referendoEntrega,
            ...referendoEntrega
        }
        if (destinoId) findManifiesto.destinoId = destinoId;
        if (destinoFinal) findManifiesto.destinoFinal = {
            ...findManifiesto.destinoFinal,
            ...destinoFinal
        }
        if (referendoRecepcion) findManifiesto.referendoRecepcion = {
            ...findManifiesto.referendoRecepcion,
            ...referendoRecepcion
        }
        if (otrosManejos) findManifiesto.otrosManejos = {
            ...findManifiesto.otrosManejos,
            ...otrosManejos
        }
        if (otrasObligaciones) {
            findManifiesto.otrasObligaciones = {
                ...findManifiesto.otrasObligaciones,
                ...otrasObligaciones
            }
        }
        if (estado) findManifiesto.estado = estado;
        if (aprobadoPor) findManifiesto.aprobadoPor = aprobadoPor;
        if (modificadoPor) findManifiesto.modificadoPor = modificadoPor;
        if (rechazadoPor) findManifiesto.rechazadoPor = rechazadoPor;
        if (subsanadoPor) findManifiesto.subsanadoPor = subsanadoPor;
        if (observacion) findManifiesto.observacion = observacion;
        if (observadoPor) findManifiesto.observadoPor = observadoPor;
        await findManifiesto.save();

        return res.json({
            message: "Manifiesto actualizado exitosamente",
            data: findManifiesto,
            type: "Correcto"
        });



    } catch (error) {
        console.error("Error en patchManifiesto:", error);
        return res.status(500).json({ message: error.message || "Error al actualizar el manifiesto", type: "Error" });
    }
};

module.exports = patchManifiesto;