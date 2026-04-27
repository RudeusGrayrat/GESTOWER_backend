const StockAlmacen = require("../../../../models/AllModulos/Almacen/Stock");


const patchStockAlmacen = async (req, res) => {
  const { bienId, diferenciaCantidad } = req.body; // diferenciaCantidad puede ser positiva o negativa

  try {
    const stock = await StockAlmacen.findOne({ bienId });

    if (!stock) {
      return res.status(404).json({ message: "Stock no encontrado" });
    }

    // Validar que no estemos sacando más de lo que hay disponible
    if (stock.cantidadDisponible + diferenciaCantidad < 0) {
      return res.status(400).json({ message: "La cantidad disponible no puede ser menor a 0" });
    }

    stock.cantidadDisponible += diferenciaCantidad;

    // Actualizar estado automáticamente
    if (stock.cantidadDisponible === 0 && stock.cantidadTotal > 0) {
      // Ojo: AGOTADO sería si cantidadTotal es 0. 
      // Si cantidadTotal > 0 pero disponible es 0, significa que todo está ubicado.
      stock.estado = "ACTIVO";
    }

    await stock.save();
    return res.status(200).json({ message: "Stock disponible actualizado", stock });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = patchStockAlmacen;