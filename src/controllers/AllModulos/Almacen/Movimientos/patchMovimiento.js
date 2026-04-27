const Movimiento = require("../../../../models/AllModulos/Almacen/Movimiento");
const StockAlmacen = require("../../../../models/AllModulos/Almacen/Stock");
const Ubicacion = require("../../../../models/AllModulos/Almacen/Ubicacion");
const { uploadImage, deleteImage, extractPublicId, cleanBase64 } = require("../../../../utils/cloudinary/images");

const patchMovimiento = async (req, res) => {
  const { _id, actualizadoPor, estadoActa, estado, referenciaImagen, ...otrosCampos } = req.body;
  const uploadedPublicIds = [];

  try {
    if (!actualizadoPor || !_id) {
      return res.status(400).json({ message: "Faltan datos requeridos", type: "Error" });
    }

    const movimientoPrevio = await Movimiento.findById(_id);
    if (!movimientoPrevio) {
      return res.status(404).json({ message: "Movimiento no encontrado", type: "Error" });
    }

    // --- GESTIÓN DE IMAGEN ACTUALIZADA ---
    let urlImagen = movimientoPrevio.referenciaImagen;
    const esBase64 = referenciaImagen && referenciaImagen.includes("base64");
    const quiereEliminar = !referenciaImagen || referenciaImagen === ""; // Si el front manda null o string vacío

    if (esBase64) {
      // CASO 1: SUBIR NUEVA (Y borrar la anterior si existe)
      if (movimientoPrevio.referenciaImagen && movimientoPrevio.referenciaImagen.startsWith("http")) {
        const oldPublicId = extractPublicId(movimientoPrevio.referenciaImagen);
        if (oldPublicId) await deleteImage(oldPublicId);
      }

      const fileBuffer = Buffer.from(cleanBase64(referenciaImagen), "base64");
      const fileName = `movimiento_edit_${_id}_${Date.now()}`;
      const result = await uploadImage(fileBuffer, fileName);

      urlImagen = result.secure_url;
      uploadedPublicIds.push(extractPublicId(urlImagen));

    } else if (quiereEliminar && movimientoPrevio.referenciaImagen) {
      // CASO 2: ELIMINAR EXISTENTE
      if (movimientoPrevio.referenciaImagen.startsWith("http")) {
        const oldPublicId = extractPublicId(movimientoPrevio.referenciaImagen);
        if (oldPublicId) await deleteImage(oldPublicId);
      }
      urlImagen = ""; // Limpiamos la URL para la base de datos
    }

    // --- LÓGICA DE ESTADOS ---
    const yaEstabaAprobado = movimientoPrevio.datosGenerales?.estadoActa === "APROBADO";
    const seVaAAprobar = estadoActa === "APROBADO";
    const seVaAAnular = estado === "ANULADO";

    // Actualización de campos
    Object.assign(movimientoPrevio, otrosCampos);
    movimientoPrevio.referenciaImagen = urlImagen;

    if (estadoActa) {
      movimientoPrevio.datosGenerales.estadoActa = estadoActa;
    }

    if (estado) {
      movimientoPrevio.estado = estado;
      if (seVaAAnular) movimientoPrevio.anuladoPor = actualizadoPor;
    }

    movimientoPrevio.actualizadoPor = actualizadoPor;
    const movimientoActualizado = await movimientoPrevio.save();

    // --- LÓGICA DE STOCK ---
    if (seVaAAprobar && !yaEstabaAprobado) {
      if (movimientoActualizado.movimiento === "INGRESO") {
        const stocks = movimientoActualizado.descripcionBienes.map((bien) => ({
          movimientoId: movimientoActualizado._id,
          bienId: bien._id,
          descripcion: bien.descripcion,
          cantidadTotal: bien.cantidadIngresada,
          cantidadDisponible: bien.cantidadIngresada,
          sedeId: movimientoActualizado.sedeId,
          contratoId: movimientoActualizado.contratoId,
          creadoPor: actualizadoPor,
        }));
        await StockAlmacen.insertMany(stocks);
      }

      if (movimientoActualizado.movimiento === "SALIDA") {
        for (const bien of movimientoActualizado.descripcionBienes) {
          const idABuscar = bien.bienIdOriginal || bien._id;
          await StockAlmacen.findOneAndUpdate(
            { bienId: idABuscar },
            { cantidadTotal: 0, cantidadDisponible: 0 }
          );
          await Ubicacion.updateMany(
            { "bienes.bienId": idABuscar },
            { $pull: { bienes: { bienId: idABuscar } } }
          );
        }
      }
    }

    // --- REVERSIÓN POR ANULACIÓN ---
    if (seVaAAnular && yaEstabaAprobado) {
      if (movimientoActualizado.movimiento === "INGRESO") {
        for (const bien of movimientoActualizado.descripcionBienes) {
          await StockAlmacen.deleteOne({ bienId: bien._id });
          await Ubicacion.updateMany(
            { "bienes.bienId": bien._id },
            { $pull: { bienes: { bienId: bien._id } } }
          );
        }
      }
    }

    return res.status(200).json({
      message: seVaAAnular ? "Movimiento anulado" : seVaAAprobar ? "Aprobado y Stock actualizado" : "Actualizado",
      movimiento: movimientoActualizado,
      type: "Correcto",
    });

  } catch (error) {
    if (uploadedPublicIds.length > 0) {
      await Promise.allSettled(uploadedPublicIds.map((id) => deleteImage(id)));
    }
    console.error("Error en patchMovimiento:", error);
    return res.status(500).json({ message: error.message, type: "Error" });
  }
};

module.exports = patchMovimiento;