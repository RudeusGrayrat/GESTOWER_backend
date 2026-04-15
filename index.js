require("dotenv").config();
const { PORT } = process.env;
const { httpServer } = require("./src/app");
const connectDB = require("./src/dbConnection");
const libre = require("libreoffice-convert");

// Apuntar directamente al ejecutable
libre.soffice = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";

const warmUpLibreOffice = () => {
  const minimalDocx = Buffer.from("PK\x03\x04", "binary");
  libre.convert(minimalDocx, ".pdf", undefined, (err) => {
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
  warmUpLibreOffice(); // 👈 aquí, cuando el servidor ya está listo
});