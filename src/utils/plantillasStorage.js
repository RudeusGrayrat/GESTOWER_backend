const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { randomUUID } = require("crypto");

const storageRoot = path.join(process.cwd(), "storage", "plantillas");
fs.mkdirSync(storageRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, storageRoot),
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const uploadPlantilla = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isDocx = file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    cb(isDocx ? null : new Error("Solo se permiten archivos .docx"), isDocx);
  },
});

const publicPath = (filename) => `/uploads/plantillas/${filename}`;

const resolvePlantillaPath = (archivo) => {
  if (!archivo || !archivo.startsWith("/uploads/plantillas/")) return null;
  const filename = path.basename(archivo);
  const resolved = path.resolve(storageRoot, filename);
  return resolved.startsWith(storageRoot) ? resolved : null;
};

const removePlantillaFile = (archivo) => {
  const filePath = resolvePlantillaPath(archivo);
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
};

module.exports = { uploadPlantilla, publicPath, resolvePlantillaPath, removePlantillaFile, storageRoot };
