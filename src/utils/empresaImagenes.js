const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const directorioEmpresas = path.join(process.cwd(), "storage", "empresas");
const extensiones = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
};

const guardarImagenEmpresa = (valor, prefijo) => {
  if (!valor || typeof valor !== "string" || !valor.startsWith("data:image/")) return valor;

  const coincidencia = valor.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!coincidencia || !extensiones[coincidencia[1]]) {
    throw new Error("El formato de imagen de empresa no es válido.");
  }

  const contenido = Buffer.from(coincidencia[2].replace(/\s/g, ""), "base64");
  if (!contenido.length) throw new Error("La imagen de empresa está vacía.");

  fs.mkdirSync(directorioEmpresas, { recursive: true });
  const nombre = `${prefijo}-${uuidv4()}.${extensiones[coincidencia[1]]}`;
  fs.writeFileSync(path.join(directorioEmpresas, nombre), contenido);
  return `/uploads/empresas/${nombre}`;
};

const eliminarImagenEmpresa = (valor) => {
  if (!valor || typeof valor !== "string" || !valor.startsWith("/uploads/empresas/")) return;

  const nombre = path.basename(valor);
  const archivo = path.join(directorioEmpresas, nombre);
  if (fs.existsSync(archivo)) fs.unlinkSync(archivo);
};

module.exports = { guardarImagenEmpresa, eliminarImagenEmpresa };
