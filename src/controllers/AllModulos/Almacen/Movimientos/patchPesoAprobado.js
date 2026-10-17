const Movimiento = require("../../../../models/AllModulos/Almacen/Movimiento");
const Stock = require("../../../../models/AllModulos/Almacen/Stock");

const patchPesoAprobado = async (req, res) => {
  try {
    const { movimientoId, bienId, pesoNeto, pesoBruto, justificacion } = req.body;
    if (!movimientoId || !bienId || !justificacion?.trim()) return res.status(400).json({ message: "Bien y justificación son obligatorios", type: "Error" });

    const movimiento = await Movimiento.findById(movimientoId);
    if (!movimiento || movimiento.estado !== "APROBADO") return res.status(400).json({ message: "Solo se corrige peso en movimientos aprobados", type: "Error" });
    const bien = movimiento.descripcionBienes.id(bienId);
    if (!bien) return res.status(404).json({ message: "Ítem del movimiento no encontrado", type: "Error" });

    const cambiaNeto = pesoNeto !== undefined && pesoNeto !== "";
    const cambiaBruto = pesoBruto !== undefined && pesoBruto !== "";
    if (!cambiaNeto && !cambiaBruto) return res.status(400).json({ message: "Indique al menos un peso a corregir", type: "Error" });
    const pesoNetoNuevo = cambiaNeto ? Number(pesoNeto) : Number(bien.pesoNeto || 0);
    const pesoBrutoNuevo = cambiaBruto ? Number(pesoBruto) : Number(bien.pesoBruto || 0);
    if (!Number.isFinite(pesoNetoNuevo) || !Number.isFinite(pesoBrutoNuevo) || pesoNetoNuevo < 0 || pesoBrutoNuevo < 0) {
      return res.status(400).json({ message: "Los pesos deben ser números válidos no negativos", type: "Error" });
    }

    const stockQuery = movimiento.movimiento === "INGRESO"
      ? { movimientoId, bienId }
      : { bienId: bien.bienIdOriginal || bien._id, contratoId: movimiento.contratoId, sedeId: movimiento.sedeId };
    const stock = await Stock.findOne(stockQuery);
    if (!stock) return res.status(404).json({ message: "No se encontró el stock vinculado al ítem", type: "Error" });
    const direction = movimiento.movimiento === "INGRESO" ? 1 : -1;
    const netoResultante = Number(stock.pesoNeto || 0) + direction * (pesoNetoNuevo - Number(bien.pesoNeto || 0));
    const brutoResultante = Number(stock.pesoBruto || 0) + direction * (pesoBrutoNuevo - Number(bien.pesoBruto || 0));
    if (netoResultante < 0 || brutoResultante < 0) return res.status(400).json({ message: "La corrección dejaría el stock con peso negativo", type: "Error" });

    movimiento.historialCambiosPeso.push({
      bienId,
      pesoNetoAnterior: Number(bien.pesoNeto || 0), pesoNetoNuevo,
      pesoBrutoAnterior: Number(bien.pesoBruto || 0), pesoBrutoNuevo,
      justificacion: justificacion.trim(), corregidoPor: req.user?._id || req.body.corregidoPor,
    });
    bien.pesoNeto = String(pesoNetoNuevo);
    bien.pesoBruto = String(pesoBrutoNuevo);
    stock.pesoNeto = String(netoResultante);
    stock.pesoBruto = String(brutoResultante);
    stock.historial.unshift({ accion: "CORRECCION_PESO", cantidadTotal: stock.cantidadTotal, cantidadDisponible: stock.cantidadDisponible, actualizadoPor: req.user?._id || req.body.corregidoPor });
    await Promise.all([movimiento.save(), stock.save()]);
    return res.json({ message: "Peso corregido y auditado", type: "Correcto" });
  } catch (error) {
    return res.status(500).json({ message: error.message, type: "Error" });
  }
};

module.exports = patchPesoAprobado;
