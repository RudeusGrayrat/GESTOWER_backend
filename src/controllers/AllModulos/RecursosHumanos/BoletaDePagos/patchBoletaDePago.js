const BoletaDePagos = require("../../../../models/RecursosHumanos/BoletaDePago");
const normalizarConceptosBoleta = require("./normalizarConceptosBoleta");

const patchBoleDePago = async (req, res) => {
  const {
    _id,
    fechaBoletaDePago,
    colaborador,
    envio,
    recepcion,
    state,
    diasTrabajados,
    diasSubsidiados,
    horasTrabajadas,
    diasNoLaborales,
    remuneraciones,
    descuentosAlTrabajador,
    aportacionesDelEmpleador,
  } = req.body;
  try {
    const boletaDePago = await BoletaDePagos.findById(_id);
    if (!boletaDePago) {
      return res.status(404).json({ message: "Boleta de pago no encontrada" });
    }
    const existingBoleta = await BoletaDePagos.findOne({
      _id: { $ne: _id },
      colaborador: colaborador,
      fechaBoletaDePago: fechaBoletaDePago,
    });

    if (existingBoleta) {
      return res.status(400).json({
        message:
          "Ya existe una boleta de pago para este colaborador en esta fecha",
      });
    }
    if (fechaBoletaDePago) boletaDePago.fechaBoletaDePago = fechaBoletaDePago;
    if (colaborador) boletaDePago.colaborador = colaborador;
    if (envio) boletaDePago.envio = envio;
    if (recepcion) boletaDePago.recepcion = recepcion;
    if (state) boletaDePago.state = state;
    if (diasTrabajados) boletaDePago.diasTrabajados = diasTrabajados;
    if (diasSubsidiados) boletaDePago.diasSubsidiados = diasSubsidiados;
    if (horasTrabajadas) boletaDePago.horasTrabajadas = horasTrabajadas;
    if (diasNoLaborales) boletaDePago.diasNoLaborales = diasNoLaborales;
    const conceptosBoleta = await normalizarConceptosBoleta({
      remuneraciones: remuneraciones || boletaDePago.remuneraciones,
      descuentosAlTrabajador:
        descuentosAlTrabajador || boletaDePago.descuentosAlTrabajador,
      aportacionesDelEmpleador:
        aportacionesDelEmpleador || boletaDePago.aportacionesDelEmpleador,
    });
    if (remuneraciones) boletaDePago.remuneraciones = conceptosBoleta.remuneraciones;
    if (descuentosAlTrabajador)
      boletaDePago.descuentosAlTrabajador = conceptosBoleta.descuentosAlTrabajador;
    if (aportacionesDelEmpleador)
      boletaDePago.aportacionesDelEmpleador = conceptosBoleta.aportacionesDelEmpleador;
    await boletaDePago.save();

    return res.status(200).json({
      message: "Boleta de pago editada correctamente",
      boletaDePago,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, type: "Error" });
  }
};

module.exports = patchBoleDePago;
