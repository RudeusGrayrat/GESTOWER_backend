const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { randomUUID } = require("crypto");

const storageRoot = path.join(process.cwd(), "storage", "actas-movimientos");
fs.mkdirSync(storageRoot, { recursive: true });

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, storageRoot),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

const uploadActasMovimiento = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    cb(allowedMimeTypes.has(file.mimetype) ? null : new Error("Solo se permiten archivos PDF, JPG o PNG"), allowedMimeTypes.has(file.mimetype));
  },
});

module.exports = { uploadActasMovimiento, storageRoot };
