const Stock = require("../../../../models/AllModulos/Almacen/Stock");

const getStockByMovimientoId = async (req, res) => {
    try {
        const { movimientoId } = req.params;
        console.log("Movimiento ID recibido:", movimientoId);

        if (!movimientoId) {
            return res.status(400).json({ type: "Error", message: "Falta el ID del movimiento" });
        }
        const stocks = await Stock.find({
            movimientoId: movimientoId,
            cantidadTotal: { $gt: 0 }
        });

        return res.status(200).json({ type: "Correcto", data: stocks });
    } catch (err) {
        return res.status(500).json({ type: "Error", message: err.message });
    }
};

module.exports = getStockByMovimientoId;