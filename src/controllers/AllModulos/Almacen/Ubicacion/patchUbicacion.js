const Stock = require("../../../../models/AllModulos/Almacen/Stock");
const Ubicacion = require("../../../../models/AllModulos/Almacen/Ubicacion");

const patchUbicacion = async (req, res) => {
  const { _id, bienes, porcentaje, estado, actualizadoPor, observaciones } = req.body;

  try {
    const ubicacion = await Ubicacion.findById(_id);
    if (!ubicacion) return res.status(404).json({ message: "Ubicación no encontrada" });

    if (bienes) {
      // 1. Mapeamos lo anterior usando stockId
      const stockAnteriorMap = {};
      ubicacion.bienes.forEach((b) => {
        stockAnteriorMap[b.stockId?.toString()] = b.cantidadIngresada;
      });

      // 2. Mapeamos lo nuevo
      const stockNuevoMap = {};
      bienes.forEach((b) => {
        stockNuevoMap[b.stockId?.toString()] = b.cantidadIngresada;
      });

      const todosLosIds = new Set([...Object.keys(stockAnteriorMap), ...Object.keys(stockNuevoMap)]);

      for (const stockId of todosLosIds) {


        // ... dentro del bucle for (const stockId of todosLosIds) ...
        const cantAnterior = Number(stockAnteriorMap[stockId] || 0);
        const cantNueva = Number(stockNuevoMap[stockId] || 0);

        // Si cantNueva es 0 porque ya no viene en el body, 
        // diferencia será (0 - cantAnterior) = negativo.
        // El sistema interpretará que se están quitando todos y los devolverá al disponible.
        const diferencia = cantNueva - cantAnterior;

        if (diferencia !== 0) {
          const stockDoc = await Stock.findById(stockId);

          if (stockDoc) {
            // Validamos stock insuficiente solo si estamos agregando (diferencia > 0)
            if (diferencia > 0 && stockDoc.cantidadDisponible < diferencia) {
              return res.status(400).json({
                message: `Stock insuficiente para ${stockDoc.descripcion}. Disponible: ${stockDoc.cantidadDisponible}`
              });
            }

            // A. ACTUALIZAMOS SALDO (Si diferencia es negativa, -= neg se vuelve suma +=)
            stockDoc.cantidadDisponible -= diferencia;

            // B. DETERMINAMOS TIPO DE ACCIÓN PARA EL HISTORIAL
            let tipoAccion = "";
            if (cantAnterior > 0 && cantNueva === 0) {
              tipoAccion = "Eliminación/Retiro Total";
            } else {
              tipoAccion = diferencia > 0 ? 'Asignación' : 'Ajuste/Retiro';
            }

            const detalleUbicacion = `${ubicacion.rack} - Nivel ${ubicacion.nivel} - Seccion ${ubicacion.seccion}`;

            stockDoc.historial.push({
              fecha: new Date(),
              cantidadIngresada: diferencia,
              cantidadDisponible: stockDoc.cantidadDisponible,
              ubicacion: `${detalleUbicacion} (${tipoAccion})`,
              actualizadoPor: actualizadoPor
            });

            await stockDoc.save();
          }
        }
      }
      // Actualizamos el array de bienes con el nuevo stockId y cantidadIngresada
      ubicacion.bienes = bienes;
    }

    // Lógica de estados
    if (porcentaje !== undefined) ubicacion.porcentaje = porcentaje;

    if (ubicacion.bienes.length === 0 && (ubicacion.porcentaje === 0)) {
      ubicacion.estado = "LIBRE";
    } else {
      ubicacion.estado = estado || (ubicacion.porcentaje >= 100 ? "OCUPADO" : "PARCIALMENTE OCUPADO");
    }

    if (observaciones) ubicacion.observaciones = observaciones;
    if (actualizadoPor) ubicacion.actualizadoPor = actualizadoPor;

    await ubicacion.save();
    return res.status(200).json({ message: "Ubicación y Stock sincronizados", ubicacion });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = patchUbicacion;