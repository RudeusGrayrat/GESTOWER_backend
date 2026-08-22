const DatosContables = require("../../../../models/RecursosHumanos/DatosContablesBoleta");

const normalizarItemsBoleta = async (items = []) => {
  const codigos = [
    ...new Set(items.map((item) => item?.datosContables).filter(Boolean)),
  ];

  const datos = await DatosContables.find({ codigoPlame: { $in: codigos } }).lean();
  const conceptosPorCodigo = datos.reduce((acc, dato) => {
    acc[dato.codigoPlame] = dato.concepto;
    return acc;
  }, {});

  return items.map((item) => {
    const conceptoCatalogo = conceptosPorCodigo[item?.datosContables];
    const concepto = item?.concepto
      ? String(item.concepto).trim()
      : conceptoCatalogo || "";

    return {
      ...item,
      concepto,
      conceptoPersonalizado: Boolean(item?.conceptoPersonalizado),
    };
  });
};

const normalizarConceptosBoleta = async ({
  remuneraciones = [],
  descuentosAlTrabajador = [],
  aportacionesDelEmpleador = [],
}) => ({
  remuneraciones: await normalizarItemsBoleta(remuneraciones),
  descuentosAlTrabajador: await normalizarItemsBoleta(descuentosAlTrabajador),
  aportacionesDelEmpleador: await normalizarItemsBoleta(aportacionesDelEmpleador),
});

module.exports = normalizarConceptosBoleta;
