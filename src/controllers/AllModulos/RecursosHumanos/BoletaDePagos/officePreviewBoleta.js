const jwt = require("jsonwebtoken");
const { URL_BACKEND, JWT_SECRET } = process.env;
const { generarWordBoleta } = require("./documentoBoleta");

const DURACION_ENLACE = "5m";

const crearOfficePreview = (req, res) => {
  try {
    if (!URL_BACKEND || !JWT_SECRET) {
      return res.status(500).json({ message: "No está configurada la URL pública para el visor de Office" });
    }
    const token = jwt.sign({ boletaId: req.params.id, uso: "office-preview" }, JWT_SECRET, { expiresIn: DURACION_ENLACE });
    const apiUrl = URL_BACKEND.replace(/\/$/, "");
    const documentoUrl = `${apiUrl}/boletas/${req.params.id}/office-preview.docx?token=${encodeURIComponent(token)}`;
    return res.json({
      embedUrl: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentoUrl)}`,
      viewUrl: `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(documentoUrl)}`,
      expiresIn: 300,
    });
  } catch (error) {
    return res.status(500).json({ message: "No se pudo preparar la vista previa de Office" });
  }
};

const entregarDocumentoOffice = async (req, res) => {
  try {
    const payload = jwt.verify(req.query.token, JWT_SECRET);
    if (payload.uso !== "office-preview" || payload.boletaId !== req.params.id) {
      return res.status(403).send("Enlace de vista previa inválido");
    }
    const { wordBuffer, nombre } = await generarWordBoleta(req.params.id);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `inline; filename="${nombre}"`,
      "Content-Length": wordBuffer.length,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    });
    return res.send(wordBuffer);
  } catch (error) {
    const status = error.name === "TokenExpiredError" || error.name === "JsonWebTokenError" ? 403 : error.status || 500;
    console.error("Error al entregar DOCX para Office Viewer:", error.message);
    return res.status(status).send(status === 403 ? "Enlace de vista previa vencido o inválido" : "No se pudo generar el documento");
  }
};

module.exports = { crearOfficePreview, entregarDocumentoOffice };
