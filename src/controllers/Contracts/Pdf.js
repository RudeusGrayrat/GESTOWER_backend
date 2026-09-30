const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const path = require("path");
const Contract = require("../../models/Contracts");
const PlantillasDeContrato = require("../../models/RecursosHumanos/PlantillasDeContrato");
const axios = require("axios");
const obtenerPlantillaLocal = require("../../utils/obtenerPlantillaLocal");

// Ruta para procesar una plantilla
const Pdf = async (req, res) => {
  const { id: _id } = req.params;

  try {
    const datosDelContrato = await Contract.findById(_id);
    if (!datosDelContrato) {
      return res.status(404).send("Contrato no encontrado");
    }

    const plantillaLocal = await obtenerPlantillaLocal({
      tipo: "CONTRATO",
      tipoContrato: datosDelContrato.typeContract,
    });
    const planillaOfContract = await PlantillasDeContrato.findOne({
      tipoContrato: datosDelContrato.typeContract,
    });
    if (!plantillaLocal && !planillaOfContract) {
      return res.status(404).send("Plantilla no encontrada");
    }

    const data = {
      empresa_razon_social: datosDelContrato.razonSocial,
      empresa_ruc: datosDelContrato.ruc,
      empresa_domicilio_fiscal: datosDelContrato.domicilioFiscal,
      representante_nombres: datosDelContrato.representative,
      colaborador_nombres: datosDelContrato.colaborator.name,
      colaborador_tipo_documento: datosDelContrato.colaborator.documentType,
      colaborador_numero_documento: datosDelContrato.colaborator.documentNumber,
      colaborador_domicilio: datosDelContrato.colaborator.address,
      sueldo: datosDelContrato.colaborator.sueldo,
    };

    const content = plantillaLocal
      ? fs.readFileSync(plantillaLocal.ruta, "binary")
      : Buffer.from((await axios.get(planillaOfContract.archivo, { responseType: "arraybuffer" })).data, "binary");
    const zip = new PizZip(content);

    // Configurar docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "@", end: "" },
    });

    // Insertar los datos en la plantilla
    doc.setData(data);

    // Renderizar el documento
    doc.render();

    // Generar el archivo resultante en memoria
    const buffer = doc.getZip().generate({ type: "nodebuffer" });

    // Enviar el archivo generado al cliente directamente sin necesidad de guardarlo en el servidor
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="documento.docx"'
    );
    res.send(buffer); // 'buffer' es el contenido del archivo generado
  } catch (error) {
    console.error("Error al generar el documento:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = Pdf;
