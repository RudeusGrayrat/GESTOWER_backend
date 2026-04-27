
const StockAlmacen = require("../../../../models/AllModulos/Almacen/Stock");

const getStockProductoUbicacion = async (req, res) => {
    try {
        const { bienId } = req.query; // MODIFICADO

        if (!bienId) {
            return res.status(400).json({
                message: "Falta parámetro bienId",
                type: "Error",
            });
        }

        const stock = await StockAlmacen.findOne({ bienId }); // MODIFICADO

        if (!stock) {
            return res.status(200).json({
                message: "No se encontró stock para el producto en esa ubicación",
                type: "Correcto",
            });
        }

        return res.status(200).json(stock);
    } catch (error) {
        return res.status(500).json({
            message: "Error al buscar el stock",
            type: "Error",
        });
    }
};

module.exports = getStockProductoUbicacion;