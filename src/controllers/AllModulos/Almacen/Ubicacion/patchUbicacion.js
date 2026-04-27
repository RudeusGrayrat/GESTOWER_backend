const Stock = require("../../../../models/AllModulos/Almacen/Stock");
const Ubicacion = require("../../../../models/AllModulos/Almacen/Ubicacion");

const patchUbicacion = async (req, res) => {
  const { _id, bienes, porcentaje, estado, actualizadoPor, observaciones } = req.body;

  try {
    const ubicacion = await Ubicacion.findById(_id);
    if (!ubicacion) return res.status(404).json({ message: "Ubicación no encontrada" });

    // --- ESCENARIO: SINCRONIZACIÓN DE BIENES, STOCK E HISTORIAL ---
    if (bienes) {
      // 1. Mapa de lo que había en la base de datos (Antes del cambio)
      const stockAnteriorMap = {};
      ubicacion.bienes.forEach((b) => {
        stockAnteriorMap[b.bienId.toString()] = b.cantidad;
      });

      // 2. Mapa de lo que envió el usuario desde el Front
      const stockNuevoMap = {};
      bienes.forEach((b) => {
        stockNuevoMap[b.bienId.toString()] = b.cantidad;
      });

      // 3. Identificamos todos los bienes afectados
      const todosLosIds = new Set([
        ...Object.keys(stockAnteriorMap),
        ...Object.keys(stockNuevoMap),
      ]);

      for (const bienId of todosLosIds) {
        const cantAnterior = Number(stockAnteriorMap[bienId] || 0);
        const cantNueva = Number(stockNuevoMap[bienId] || 0);

        // DIFERENCIA: 
        // Si es positiva: estamos metiendo más bienes a esta ubicación (resta de stock disponible)
        // Si es negativa: estamos quitando bienes de esta ubicación (devuelve al stock disponible)
        const diferencia = cantNueva - cantAnterior;

        if (diferencia !== 0) {
          const stockDoc = await Stock.findOne({ bienId: bienId });

          if (stockDoc) {
            // Validación de seguridad: no puedes ubicar lo que no tienes
            if (diferencia > 0 && stockDoc.cantidadDisponible < diferencia) {
              return res.status(400).json({
                message: `Stock insuficiente para ${stockDoc.descripcion}. Disponible: ${stockDoc.cantidadDisponible}, requerido: ${diferencia}`
              });
            }

            // A. ACTUALIZAMOS SALDO DISPONIBLE
            stockDoc.cantidadDisponible -= diferencia;

            // B. ACTUALIZAMOS HISTORIAL (Auditoría interna del Stock)
            // Esto permite que el componente DetaiStock muestre la línea de tiempo
            stockDoc.historial.push({
              fecha: new Date(),
              cantidadDisponible: stockDoc.cantidadDisponible,
              // Guardamos la referencia de la ubicación para saber a dónde se movió
              ubicacion: `${ubicacion.rack} - Nivel ${ubicacion.nivel} (${diferencia > 0 ? 'Asignación' : 'Retiro'})`,
              actualizadoPor: actualizadoPor
            });

            await stockDoc.save();
          }
        }
      }

      // 4. Sincronizamos los bienes en el documento de la Ubicación
      ubicacion.bienes = bienes;
    }

    // --- ESCENARIO: METADATOS Y LÓGICA DE ESTADOS ---
    if (porcentaje !== undefined) ubicacion.porcentaje = porcentaje;

    if (bienes || porcentaje !== undefined) {
      // Si no hay bienes y el porcentaje es 0, la ubicación queda LIBRE
      if (ubicacion.bienes.length === 0 && (porcentaje === 0 || porcentaje === undefined)) {
        ubicacion.estado = "LIBRE";
        ubicacion.porcentaje = 0;
      } else {
        // De lo contrario, calculamos si está OCUPADO o PARCIALMENTE OCUPADO
        ubicacion.estado = estado || (ubicacion.porcentaje >= 100 ? "OCUPADO" : "PARCIALMENTE OCUPADO");
      }
    }

    if (observaciones) ubicacion.observaciones = observaciones;
    if (actualizadoPor) ubicacion.actualizadoPor = actualizadoPor;

    await ubicacion.save();

    return res.status(200).json({
      message: "Ubicación, Stock e Historial actualizados correctamente",
      ubicacion
    });

  } catch (err) {
    console.error("Error en patchUbicacion:", err);
    return res.status(500).json({ message: "Error interno: " + err.message });
  }
};

module.exports = patchUbicacion;