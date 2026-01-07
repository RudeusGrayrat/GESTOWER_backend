const ProductoAlmacen = require("../../../../models/AllModulos/Almacen/Producto");

const patchProductoAlmacen = async (req, res) => {
  try {
    console.log("ENTRAMOS A PATCH PRODUCTO ALMACEN");
    const { _id, unidadDeMedida, descripcion, subItem, observaciones, estado } = req.body;
    console.log(req.body);
    if (!_id) {
      return res.status(400).json({
        message: "ID del producto es requerido",
      });
    }
    const findProducto = await ProductoAlmacen.findById(_id);

    if (descripcion) findProducto.descripcion = descripcion;
    if (unidadDeMedida) findProducto.unidadDeMedida = unidadDeMedida;
    if (subItem) findProducto.subItem = subItem;
    if (observaciones) findProducto.observaciones = observaciones;
    if (estado) findProducto.estado = estado;

    const response = await findProducto.save();

    return res.status(200).json({
      message: "Producto actualizado correctamente",
      data: response,
      type: "Correcto",
    });
  } catch (error) {
    console.log("ERROR EN PATCH PRODUCTO ALMACEN:", error);
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = patchProductoAlmacen;
