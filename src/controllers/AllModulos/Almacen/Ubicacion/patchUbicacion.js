const Stock = require("../../../../models/AllModulos/Almacen/Stock");
const Ubicacion = require("../../../../models/AllModulos/Almacen/Ubicacion");

const patchUbicacion = async (req, res) => {
  const { _id, bienes, porcentaje, estado, actualizadoPor, observaciones } = req.body;

  try {
    const ubicacion = await Ubicacion.findById(_id);
    if (!ubicacion) return res.status(404).json({ message: "Ubicación no encontrada", type: "Error" });

    if (bienes) {
      const stockAnteriorMap = {};
      ubicacion.bienes.forEach((b) => {
        stockAnteriorMap[b.stockId?.toString()] = b.cantidadIngresada;
      });

      const stockNuevoMap = {};
      bienes.forEach((b) => {
        stockNuevoMap[b.stockId?.toString()] = b.cantidadIngresada;
      });

      const todosLosIds = new Set([...Object.keys(stockAnteriorMap), ...Object.keys(stockNuevoMap)]);

      for (const stockId of todosLosIds) {
        const cantAnterior = Number(stockAnteriorMap[stockId] || 0);
        const cantNueva = Number(stockNuevoMap[stockId] || 0);
        const diferencia = cantNueva - cantAnterior;

        if (diferencia !== 0) {
          const stockDoc = await Stock.findById(stockId);
          if (stockDoc) {
            // Validar stock disponible si se intenta asignar más
            if (diferencia > 0 && stockDoc.cantidadDisponible < diferencia) {
              return res.status(400).json({
                message: `Stock insuficiente para ${stockDoc.descripcion}. Disponible: ${stockDoc.cantidadDisponible}`,
                type: "Error"
              });
            }

            // 1. Actualizar saldos
            stockDoc.cantidadDisponible -= diferencia;

            // 2. Sincronizar array de ubicaciones en el Stock
            if (cantNueva > 0) {
              if (!stockDoc.ubicaciones.includes(ubicacion._id)) {
                stockDoc.ubicaciones.push(ubicacion._id);
              }
            } else {
              // Si la cantidad llega a 0 en esta ubicación, se remueve la referencia
              stockDoc.ubicaciones = stockDoc.ubicaciones.filter(
                id => id.toString() !== ubicacion._id.toString()
              );
            }

            // 3. Actualizar estado "ubicado"
            stockDoc.ubicado = stockDoc.ubicaciones.length > 0;

            // 4. Lógica de tipoAccion (Aprovechando el nuevo campo del modelo)
            let tipoAccion = "";
            if (cantAnterior === 0 && cantNueva > 0) {
              tipoAccion = "ASIGNACION"; // Primera vez que entra a esta ubicación
            } else if (cantAnterior > 0 && cantNueva === 0) {
              tipoAccion = "RETIRO_TOTAL"; // Se vació este rack para este producto
            } else if (diferencia > 0) {
              tipoAccion = "REUBICACION_INCREMENTO"; // Se trajo más de otro lado o del disponible
            } else {
              tipoAccion = "REUBICACION_DEVOLUCION"; // Se quitó un poco para moverlo a otro lado
            }

            stockDoc.historial.unshift({
              fecha: new Date(),
              cantidadIngresada: diferencia, // Valor relativo (+ o -)
              cantidadDisponible: stockDoc.cantidadDisponible, // Saldo tras la operación
              ubicacion: `${ubicacion.rack}-${ubicacion.nivel}-${ubicacion.seccion}`,
              accion: tipoAccion, // <--- Nuevo campo aprovechado
              actualizadoPor
            });

            await stockDoc.save();
          }
        }
      }
      ubicacion.bienes = bienes;
    }

    // Lógica de estado de la ubicación física
    if (porcentaje !== undefined) ubicacion.porcentaje = porcentaje;
    ubicacion.estado = (ubicacion.bienes.length === 0 && ubicacion.porcentaje === 0)
      ? "LIBRE"
      : (estado || (ubicacion.porcentaje >= 100 ? "OCUPADO" : "PARCIALMENTE OCUPADO"));

    if (observaciones) ubicacion.observaciones = observaciones;
    if (actualizadoPor) ubicacion.actualizadoPor = actualizadoPor;

    await ubicacion.save();
    return res.status(200).json({ message: "Sincronización de stock y ubicación completa", ubicacion, type: "Correcto" });
  } catch (err) {
    return res.status(500).json({ message: err.message, type: "Error" });
  }
};
module.exports = patchUbicacion;