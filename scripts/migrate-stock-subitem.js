require("dotenv").config();
const mongoose = require("mongoose");
const Stock = require("../src/models/AllModulos/Almacen/Stock");
const Movimiento = require("../src/models/AllModulos/Almacen/Movimiento");

const run = async () => {
  await mongoose.connect(process.env.DATABASE_URL);
  const stocks = await Stock.find({ subItem: { $exists: false } }).select("movimientoId bienId").lean();
  let migrated = 0;
  let notFound = 0;

  for (const stock of stocks) {
    const movimiento = await Movimiento.findById(stock.movimientoId).select("descripcionBienes").lean();
    const bien = movimiento?.descripcionBienes?.find((item) => String(item._id) === String(stock.bienId));
    if (!bien?.subItem) {
      notFound += 1;
      continue;
    }
    await Stock.updateOne({ _id: stock._id }, { $set: { subItem: bien.subItem } });
    migrated += 1;
  }

  console.log({ reviewed: stocks.length, migrated, notFound });
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
