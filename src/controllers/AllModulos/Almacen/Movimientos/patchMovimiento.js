const Movimiento = require("../../../../models/AllModulos/Almacen/Movimiento");
const StockAlmacen = require("../../../../models/AllModulos/Almacen/Stock");
const Ubicacion = require("../../../../models/AllModulos/Almacen/Ubicacion");
const { uploadImage, deleteImage, extractPublicId, cleanBase64 } = require("../../../../utils/cloudinary/images");

const patchMovimiento = async (req, res) => {
  const { _id, actualizadoPor, aprobadoPor, rechazadoPor, estado, referenciaImagen, ...otrosCampos } = req.body;
  const uploadedPublicIds = [];

  try {
    if (!actualizadoPor || !_id) {
      return res.status(400).json({ message: "Faltan datos requeridos", type: "Error" });
    }

    const movPrevio = await Movimiento.findById(_id);
    if (!movPrevio) return res.status(404).json({ message: "Movimiento no encontrado", type: "Error" });

    // --- BLOQUEO DE SEGURIDAD ---
    // Si ya fue aprobado o rechazado, no permitimos más cambios (Inamovilidad PNP/SUNAT)
    if (movPrevio.estado === "APROBADO" || movPrevio.estado === "RECHAZADO") {
      return res.status(403).json({ message: "El registro ya está cerrado", type: "Error" });
    }

    // --- GESTIÓN DE IMAGEN ---
    let urlImagen = movPrevio.referenciaImagen;
    const esBase64 = referenciaImagen && referenciaImagen.includes("base64");
    const quiereEliminar = !referenciaImagen || referenciaImagen === "";

    if (esBase64) {
      if (movPrevio.referenciaImagen?.startsWith("http")) {
        const oldId = extractPublicId(movPrevio.referenciaImagen);
        if (oldId) await deleteImage(oldId);
      }
      const result = await uploadImage(Buffer.from(cleanBase64(referenciaImagen), "base64"), `mov_${_id}_${Date.now()}`);
      urlImagen = result.secure_url;
      uploadedPublicIds.push(extractPublicId(urlImagen));
    } else if (quiereEliminar && movPrevio.referenciaImagen) {
      // Si el front manda null/vacío, borramos de Cloudinary y seteamos ""
      if (movPrevio.referenciaImagen.startsWith("http")) {
        const oldId = extractPublicId(movPrevio.referenciaImagen);
        if (oldId) await deleteImage(oldId);
      }
      urlImagen = "";
    }

    // --- ACTUALIZACIÓN DE DATOS ---
    // otrosCampos puede incluir 'estadoActa' si el front lo manda, pero aquí no influye en el stock
    Object.assign(movPrevio, otrosCampos);
    movPrevio.referenciaImagen = urlImagen;
    movPrevio.actualizadoPor = actualizadoPor;

    if (estado) {
      movPrevio.estado = estado;
      if (estado === "APROBADO") movPrevio.aprobadoPor = aprobadoPor;
      if (estado === "RECHAZADO") movPrevio.rechazadoPor = rechazadoPor;
    }

    const movActualizado = await movPrevio.save();

    // --- LÓGICA DE STOCK (Única fuente de verdad: campo 'estado') ---
    if (estado === "APROBADO") {
      if (movActualizado.movimiento === "INGRESO") {
        const stocks = movActualizado.descripcionBienes.map((bien) => ({
          movimientoId: movActualizado._id,
          bienId: bien._id,
          descripcion: bien.descripcion,
          cantidadTotal: bien.cantidadIngresada,
          cantidadDisponible: bien.cantidadIngresada,
          sedeId: movActualizado.sedeId,
          contratoId: movActualizado.contratoId,
          creadoPor: aprobadoPor,
        }));
        await StockAlmacen.insertMany(stocks);
      }

      if (movActualizado.movimiento === "SALIDA") {
        for (const bien of movActualizado.descripcionBienes) {
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

    return res.status(200).json({
      message: estado === "APROBADO" ? "Aprobado y stock actualizado" : "Cambios guardados",
      movimiento: movActualizado,
      type: "Correcto",
    });

  } catch (error) {
    if (uploadedPublicIds.length > 0) await Promise.allSettled(uploadedPublicIds.map(id => deleteImage(id)));
    console.error(error);
    return res.status(500).json({ message: error.message, type: "Error" });
  }
};

module.exports = patchMovimiento;