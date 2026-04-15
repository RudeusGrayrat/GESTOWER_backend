require("dotenv").config();
const { PORT } = process.env;
const { httpServer } = require("./src/app");
const connectDB = require("./src/dbConnection");
const libre = require("libreoffice-convert");
const fs = require("fs");
const path = require("path");

// ❌ QUITAR ESTA LÍNEA — rompe en Linux:
// libre.soffice = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";

const warmUpLibreOffice = () => {
  const warmupPath = path.join(process.cwd(), "templates", "PLANTILLA_HORAS_EXTRAS.docx");

  if (!fs.existsSync(warmupPath)) {
    console.log("⚠️ No se encontró plantilla para warm-up");
    return;
  }

  const docxBuffer = fs.readFileSync(warmupPath);
  libre.convert(docxBuffer, ".pdf", undefined, (err) => {
    if (err) {
      console.error("⚠️ Warm-up error:", err.message);
    } else {
      console.log("✅ LibreOffice warm-up completado");
    }
  });
};

connectDB();

httpServer.listen(PORT || 3001, () => {
  console.log(`Servidor corriendo en el puerto ${PORT || 3001}`);
  warmUpLibreOffice();
});