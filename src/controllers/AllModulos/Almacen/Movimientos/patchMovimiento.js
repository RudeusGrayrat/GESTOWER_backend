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
      if (estado === "APROBADO") {
        if (movimiento === "SALIDA" || movPrevio.movimiento === "SALIDA") {
          const findMovimientoIngreso = await Movimiento.findOne({
            correlativa: codigoIngreso || movPrevio.codigoIngreso,
            estado: "APROBADO",
          });
          if (!findMovimientoIngreso) {
            return res.status(404).json({ message: "Este movimiento de ingreso no está aprobado o no existe", type: "Error" });
          }
        }
        movPrevio.aprobadoPor = aprobadoPor;
      }
      if (estado === "RECHAZADO") {
        movPrevio.rechazadoPor = rechazadoPor
      };
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
          historial: [
            {
              fecha: new Date(),
              accion: "INGRESO",
              cantidadIngresada: bien.cantidadIngresada,
              cantidadDisponible: bien.cantidadIngresada,
              cantidadTotal: bien.cantidadIngresada,
              actualizadoPor: aprobadoPor,
            },
          ],
        }));
        await StockAlmacen.insertMany(stocks);
      }

      if (movActualizado.movimiento === "SALIDA") {
        for (const bien of movActualizado.descripcionBienes) {
          const idABuscar = bien.bienIdOriginal || bien._id;
          const stock = await StockAlmacen.findOne({ bienId: idABuscar });

          if (!stock) {
            throw new Error(`No se encontró stock registrado para el bien: ${bien.descripcion}`);
          }

          // === VALIDACIÓN CON LAS REGLAS CORRECTAS ===
          // No puedes despachar más de lo que tienes en el inventario global (cantidadTotal)
          if (stock.cantidadTotal < bien.cantidadIngresada) {
            throw new Error(
              `Operación inválida. Intentas retirar ${bien.cantidadIngresada} unidades de "${bien.descripcion}", pero solo quedan ${stock.cantidadTotal} en stock total.`
            );
          }

          // Limpiar ubicaciones (ya que el stock se altera)
          await Ubicacion.updateMany(
            { _id: { $in: stock.ubicaciones } },
            { $pull: { bienes: { stockId: stock._id } } }
          );
          await Ubicacion.updateMany(
            { _id: { $in: stock.ubicaciones }, bienes: { $size: 0 } },
            { $set: { estado: "LIBRE", porcentaje: 0 } }
          );

          // Ajustamos el stock total real
          stock.cantidadTotal -= bien.cantidadIngresada;

          // Ojo aquí: Como cantidadDisponible es lo "no ubicado", si sacas stock, 
          // asegúrate de que no quede en negativo si es que se saca de lo no ubicado,
          // o simplemente reiníciala si el stock se agota por completo.
          stock.cantidadDisponible = Math.max(0, stock.cantidadDisponible - bien.cantidadIngresada);

          // --- Lógica de Pesos ---
          if (bien.pesoNeto) {
            const pesoNetoActual = parseFloat(stock.pesoNeto) || 0;
            const pesoNetoSalida = parseFloat(bien.pesoNeto) || 0;
            stock.pesoNeto = String(Math.max(0, pesoNetoActual - pesoNetoSalida));
          }

          if (bien.pesoBruto) {
            const pesoBrutoActual = parseFloat(stock.pesoBruto) || 0;
            const pesoBrutoSalida = parseFloat(bien.pesoBruto) || 0;
            stock.pesoBruto = String(Math.max(0, pesoBrutoActual - pesoBrutoSalida));
          }

          // Determinar estado final del Stock
          let accionHistorial;
          if (stock.cantidadTotal <= 0) {
            stock.cantidadTotal = 0;
            stock.cantidadDisponible = 0;
            stock.estado = "AGOTADO";
            accionHistorial = "SALIDA COMPLETA";
          } else {
            stock.estado = "PARCIAL";
            accionHistorial = "SALIDA PARCIAL";
          }

          // Registrar en el historial del stock
          stock.historial.unshift({
            fecha: new Date(),
            accion: accionHistorial,
            cantidadIngresada: bien.cantidadIngresada, // Unidades que salieron hoy
            cantidadDisponible: stock.cantidadDisponible, // Lo que queda sin ubicar
            cantidadTotal: stock.cantidadTotal, // Lo que queda en total
            actualizadoPor: aprobadoPor,
          });

          stock.actualizadoPor = aprobadoPor;
          stock.ubicado = false;
          stock.ubicaciones = [];

          await stock.save();
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