const StockAlmacen = require("../../../../models/AllModulos/Almacen/Stock");

const getStockProductoUbicacion = async (req, res) => {
    try {
        console.log("ENTRAMOS A GET STOCK PRODUCTO UBICACION");
        const { productoId, ubicacionId } = req.query;
        console.log(req.query);
        if (!productoId || !ubicacionId) {
            return res.status(400).json({ message: "Faltan parámetros: productoId o ubicacionId" });
        }

        const stock = await StockAlmacen.findOne({ productoId, ubicacionId });

        if (!stock) {
            return res.status(200).json(null); // No hay stock en esa ubicación
        }

        return res.status(200).json(stock);
    } catch (error) {
        console.error("Error en getStockProductoUbicacion:", error);
        return res.status(500).json({ message: "Error al buscar el stock" });
    }
};

module.exports = getStockProductoUbicacion
