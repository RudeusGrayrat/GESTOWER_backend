const Movimiento = require("../../../../models/AllModulos/Almacen/Movimiento");
const generarCorrelativa = require("./correlativa");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");
const dayjs = require("dayjs");

const cleanBase64 = (str) => str?.includes(",") ? str.split(",")[1] : str;

const createMovimiento = async (req, res) => {
  let uploadedPublicId = null; // Para control de errores

  try {
    const { body } = req;

    if (!body || !body.movimiento || !body.contratoId || !body.sedeId || !body.descripcionBienes || body.descripcionBienes.length === 0 || body.creadoPor === undefined) {
      throw new Error("Faltan datos requeridos");
    }

    // --- Subida de Imagen a Cloudinary ---
    let imagenUrl = body.referenciaImagen;
    if (body.referenciaImagen && body.referenciaImagen.startsWith("data:image")) {
      const fileBuffer = Buffer.from(cleanBase64(body.referenciaImagen), "base64");
      const fileName = `mov_${body.correlativa}_${dayjs().format("YYYY-MM-DD")}`;
      const result = await uploadImage(fileBuffer, fileName);

      imagenUrl = result.secure_url;
      uploadedPublicId = extractPublicId(result.secure_url);
    }

    // Generar correlativa según el tipo (INGRESO/SALIDA)
    const correlativa = await generarCorrelativa(
      body.movimiento,
      body.contrato,
      body.contratoId
    );

    const movimientoData = {
      ...body,
      referenciaImagen: imagenUrl, // Guardamos la URL de Cloudinary
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
    // Si hubo un error y la imagen se subió, la borramos
    if (uploadedPublicId) {
      await deleteImage(uploadedPublicId);
    }
    return res.status(500).json({ message: err.message, type: "Error" });
  }
};

module.exports = createMovimiento;