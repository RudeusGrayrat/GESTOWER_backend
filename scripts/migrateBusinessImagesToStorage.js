require("dotenv").config();

const mongoose = require("mongoose");
const Business = require("../src/models/RecursosHumanos/Business");
const { guardarImagenEmpresa } = require("../src/utils/empresaImagenes");

const esBase64 = (valor) => typeof valor === "string" && valor.startsWith("data:image/");

const migrate = async () => {
  await mongoose.connect(process.env.DATABASE_URL);
  const empresas = await Business.find({
    $or: [
      { logo: /^data:image\// },
      { "representative.signature": /^data:image\// },
    ],
  });

  for (const empresa of empresas) {
    let cambio = false;
    if (esBase64(empresa.logo)) {
      empresa.logo = guardarImagenEmpresa(empresa.logo, "logo");
      cambio = true;
    }
    if (esBase64(empresa.representative?.signature)) {
      empresa.representative.signature = guardarImagenEmpresa(empresa.representative.signature, "firma");
      cambio = true;
    }
    if (cambio) await empresa.save();
  }

  console.log(`Migración completada: ${empresas.length} empresa(s) revisada(s).`);
  await mongoose.disconnect();
};

migrate().catch(async (error) => {
  console.error("La migración falló:", error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
