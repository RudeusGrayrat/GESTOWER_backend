const dayjs = require("dayjs");
const Movimiento = require("../../../../models/AllModulos/Almacen/Movimiento");
const StockAlmacen = require("../../../../models/AllModulos/Almacen/Stock");
const Ubicacion = require("../../../../models/AllModulos/Almacen/Ubicacion");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");

const cleanBase64 = (str) => (str?.includes(",") ? str.split(",")[1] : str);

const patchMovimiento = async (req, res) => {
  const {
    _id,
    correlativa,
    actualizadoPor,
    aprobadoPor,
    rechazadoPor,
    estado,
    referenciaImagen,
    // Campos editables del modelo:
    movimiento,
    codigoIngreso,
    numeroDeActa,
    contribuyente,
    numeroDocumento,
    datosGenerales,
    descripcionBienes,
    detallesDePeso,
    observaciones,
    horaSalida,
    fechaSalida,
    contratoId,
  } = req.body;
  const uploadedPublicIds = [];
  console.log("Uploaded Public IDs array initialized:", uploadedPublicIds);
  try {
    if (!actualizadoPor || !_id) {
      return res.status(400).json({ message: "Faltan datos requeridos", type: "Error" });
    }

    const movPrevio = await Movimiento.findById(_id);
    if (!movPrevio) {
      return res.status(404).json({ message: "Movimiento no encontrado", type: "Error" });
    }

    if (movPrevio.estado === "APROBADO" || movPrevio.estado === "RECHAZADO") {
      return res.status(403).json({ message: "El registro ya está cerrado", type: "Error" });
    }

    // --- GESTIÓN DE IMAGEN ---
    // Usamos la misma lógica que el POST: startsWith("data:image")
    if (referenciaImagen !== undefined) {
      console.log("Referencia Imagen recibida:");
      const esBase64Nueva = referenciaImagen && referenciaImagen.startsWith("data:image");
      const quiereEliminar = referenciaImagen === "" || referenciaImagen === null;
      console.log("Es base64 nueva?", esBase64Nueva);
      console.log("Quiere eliminar imagen?", quiereEliminar);

      if (esBase64Nueva) {
        // Borrar imagen anterior si existe
        if (movPrevio.referenciaImagen?.startsWith("http")) {
          const oldId = extractPublicId(movPrevio.referenciaImagen);
          if (oldId) await deleteImage(oldId);
        }
        // Subir nueva imagen
        const fileBuffer = Buffer.from(cleanBase64(referenciaImagen), "base64");
        const fileName = `mov_${correlativa || _id}_${dayjs().format("YYYY-MM-DD")}`;
        const result = await uploadImage(fileBuffer, fileName);
        console.log("Image uploaded to Cloudinary:", result);
        movPrevio.referenciaImagen = result.secure_url;
        uploadedPublicIds.push(extractPublicId(result.secure_url));
      } else if (quiereEliminar) {
        if (movPrevio.referenciaImagen?.startsWith("http")) {
          const oldId = extractPublicId(movPrevio.referenciaImagen);
          if (oldId) await deleteImage(oldId);
        }
        movPrevio.referenciaImagen = "";
      }
      // Si viene una URL de Cloudinary existente (sin cambios), no hacemos nada
    }

    // --- CAMPOS SIMPLES (solo si vienen en el body) ---
    if (movimiento !== undefined) movPrevio.movimiento = movimiento;
    if (codigoIngreso !== undefined) movPrevio.codigoIngreso = codigoIngreso;
    if (numeroDeActa !== undefined) movPrevio.numeroDeActa = numeroDeActa;
    if (contribuyente !== undefined) movPrevio.contribuyente = contribuyente;
    if (numeroDocumento !== undefined) movPrevio.numeroDocumento = numeroDocumento;
    if (detallesDePeso !== undefined) movPrevio.detallesDePeso = detallesDePeso;
    if (observaciones !== undefined) movPrevio.observaciones = observaciones;
    if (horaSalida !== undefined) movPrevio.horaSalida = horaSalida;
    if (fechaSalida !== undefined) movPrevio.fechaSalida = fechaSalida;
    if (contratoId !== undefined) movPrevio.contratoId = contratoId;

    // --- SUBDOCUMENTO datosGenerales (merge profundo, no reemplazo) ---
    if (datosGenerales !== undefined) {
      Object.assign(movPrevio.datosGenerales, datosGenerales);
    }

    // --- ARRAY descripcionBienes (reemplazo completo) ---
    if (descripcionBienes !== undefined) {
      movPrevio.descripcionBienes = descripcionBienes;
    }

    // --- AUDITORÍA Y ESTADO ---
    movPrevio.actualizadoPor = actualizadoPor;

    if (estado) {
      movPrevio.estado = estado;
      if (estado === "APROBADO") movPrevio.aprobadoPor = aprobadoPor;
      if (estado === "RECHAZADO") movPrevio.rechazadoPor = rechazadoPor;
    }

    const movActualizado = await movPrevio.save();

    // --- LÓGICA DE STOCK ---
    if (estado === "APROBADO") {
      if (movActualizado.movimiento === "INGRESO") {
        const stocks = movActualizado.descripcionBienes.map((bien) => ({
          movimientoId: movActualizado._id,
          bienId: bien._id,
          item: bien.item,
          descripcion: bien.descripcion,
          pesoNeto: bien.pesoNeto,
          pesoBruto: bien.pesoBruto,
          unidadDeMedida: bien.unidadDeMedida,
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
          const stock = await StockAlmacen.findOne({ bienId: idABuscar });

          if (stock) {
            await Ubicacion.updateMany(
              { _id: { $in: stock.ubicaciones } },
              { $pull: { bienes: { stockId: stock._id } } }
            );
            await Ubicacion.updateMany(
              { _id: { $in: stock.ubicaciones }, bienes: { $size: 0 } },
              { $set: { estado: "LIBRE", porcentaje: 0 } }
            );

            stock.cantidadTotal -= bien.cantidadIngresada;
            stock.cantidadDisponible -= bien.cantidadIngresada;
            if (bien.pesoNeto) stock.pesoNeto = bien.pesoNeto;
            if (bien.pesoBruto) stock.pesoBruto = bien.pesoBruto;

            if (stock.cantidadTotal <= 0) {
              stock.cantidadTotal = 0;
              stock.cantidadDisponible = 0;
              stock.estado = "AGOTADO";
            } else {
              stock.estado = "PARCIAL";
            }

            stock.ubicado = false;
            stock.ubicaciones = [];
            await stock.save();
          }
        }
      }
    }

    return res.status(200).json({
      message: estado === "APROBADO" ? "Aprobado y stock actualizado" : "Cambios guardados",
      movimiento: movActualizado,
      type: "Correcto",
    });

  } catch (error) {
    // Rollback de imágenes subidas si algo falló
    if (uploadedPublicIds.length > 0) {
      await Promise.allSettled(uploadedPublicIds.map((id) => deleteImage(id)));
    }
    console.error(error);
    return res.status(500).json({ message: error.message, type: "Error" });
  }
};

module.exports = patchMovimiento;