const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");

const verificarManifiesto = async (req, res) => {
    const { id } = req.params;
    const { estado, observaciones, usuarioId, referendoRecepcion } = req.body;

    try {
        if (!id) return res.status(400).json({ message: "ID del manifiesto no proporcionado", type: "Error" });

        const manifiesto = await Manifiesto.findById(id);
        if (!manifiesto) return res.status(404).json({ message: "El manifiesto no existe en el sistema", type: "Error" });

        if (manifiesto.estado === "APROBADO" || manifiesto.estado === "RECHAZADO") {
            return res.status(400).json({ message: `Operación inválida. Este documento ya fue cerrado con estado: ${manifiesto.estado}`, type: "Advertencia" });
        }

        if (manifiesto.estado === "BORRADOR" || manifiesto.estado === "PENDIENTE") {
            return res.status(400).json({ message: "No se puede evaluar un manifiesto en Borrador o Pendiente.", type: "Advertencia" });
        }

        // ==========================================
        // 🛡️ VALIDACIÓN DE FIRMA DEL DESTINO FINAL
        // ==========================================
        if (estado === "APROBADO") {
            const datosDestino = referendoRecepcion || manifiesto.referendoRecepcion;

            // Validación estricta: Validamos que existan datos Y que no sean strings vacíos
            const tieneFirmasValidas =
                datosDestino?.referendo === true &&
                typeof datosDestino?.firmaGenerador === "string" && datosDestino.firmaGenerador.trim() !== "" &&
                typeof datosDestino?.responsableEorsDestino === "string" && datosDestino.responsableEorsDestino.trim() !== "";

            if (!tieneFirmasValidas) {
                return res.status(400).json({
                    message: "Error de Validación: No se puede aprobar el manifiesto. Los datos del Referendo de Recepción o las firmas digitales del Destino Final están vacías o son inválidas.",
                    type: "Error"
                });
            }

            // Si las firmas vienen en la petición del Front, las acoplamos
            if (referendoRecepcion) {
                manifiesto.referendoRecepcion = referendoRecepcion;
            }
        }
        // ==========================================

        manifiesto.estado = estado;
        manifiesto.observacion = observaciones?.trim() || "";

        if (estado === "APROBADO") {
            manifiesto.aprobadorPor = usuarioId;
        } else if (estado === "RECHAZADO") {
            manifiesto.rechazadoPor = usuarioId;
        } else if (estado === "OBSERVADO") {
            manifiesto.observadoPor = usuarioId;
        }

        await manifiesto.save();

        // 6. Respuesta limpia adaptada a tu Hook de notificaciones
        let mensajeExito = `Manifiesto procesado con éxito como ${estado}.`;
        if (estado === "OBSERVADO") {
            mensajeExito = "El manifiesto ha sido devuelto al área correspondiente con las observaciones registradas.";
        }

        return res.status(200).json({
            message: mensajeExito,
            type: "Correcto",
            data: manifiesto
        });
    } catch (error) {
        console.error("Error crítico en verificarManifiesto:", error);
        return res.status(500).json({
            message: "Error interno del servidor al procesar las firmas y verificación del manifiesto",
            type: "Error"
        });
    }
};

module.exports = verificarManifiesto;
