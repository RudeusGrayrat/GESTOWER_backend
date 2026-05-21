const Movimiento = require("../../../../models/AllModulos/Almacen/Movimiento");
const generarCorrelativa = require("./correlativa");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");
const dayjs = require("dayjs");

const cleanBase64 = (str) => str?.includes(",") ? str.split(",")[1] : str;

const createMovimiento = async (req, res) => {
  let uploadedPublicId = []; // Para control de errores

  try {
    const { body } = req;

    if (!body || !body.movimiento || !body.contratoId || !body.sedeId || !body.descripcionBienes || body.descripcionBienes.length === 0 || body.creadoPor === undefined) {
      throw new Error("Faltan datos requeridos");
    }

    // --- Subida de Múltiples Imágenes a Cloudinary ---
    let imagenUrls = [];
    if (body.referenciaImagen && Array.isArray(body.referenciaImagen)) {
      for (let i = 0; i < body.referenciaImagen.length; i++) {
        const img = body.referenciaImagen[i];

        if (img && img.startsWith("data:image")) {
          const fileBuffer = Buffer.from(cleanBase64(img), "base64");
          const fileName = `mov_${body.correlativa}_${dayjs().format("YYYY-MM-DD")}_img${i}`;
          const result = await uploadImage(fileBuffer, fileName);

          imagenUrls.push(result.secure_url);
          uploadedPublicIds.push(extractPublicId(result.secure_url));
        } else if (img && img.startsWith("http")) {
          imagenUrls.push(img); // Si ya es URL de cloudinary remota
        }
      }
    }

    const correlativa = await generarCorrelativa(
      body.movimiento,
      body.contrato,
      body.contratoId
    );

    const movimientoData = {
      ...body,
      referenciaImagen: imagenUrls,
      correlativa,
      estado: body.estado || "PENDIENTE",
    };

    const movimiento = await Movimiento.create(movimientoData);

    return res.status(201).json({
      message: `Movimiento ${body.movimiento} registrado pendiente de aprobación`,
      data: movimiento,
      type: "Correcto",
    });

  } catch (err) {
    // Si hubo un error, borramos todas las imágenes subidas en esta transacción fallida
    if (uploadedPublicIds.length > 0) {
      await Promise.allSettled(uploadedPublicIds.map((id) => deleteImage(id)));
    }
    return res.status(500).json({ message: err.message, type: "Error" });
  }
};

module.exports = createMovimiento;