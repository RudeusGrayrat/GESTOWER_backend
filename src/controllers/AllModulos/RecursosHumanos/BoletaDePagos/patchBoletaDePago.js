const BoletaDePagos = require("../../../../models/RecursosHumanos/BoletaDePago");
const normalizarConceptosBoleta = require("./normalizarConceptosBoleta");
const Employee = require("../../../../models/Employees/Employee");
const Business = require("../../../../models/RecursosHumanos/Business");

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
    suspensionesLaborales,
    situacionTrabajador,
    tipoTrabajador,
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
    if (colaborador) {
      const colaboradorActualizado = await Employee.findById(colaborador);
      if (!colaboradorActualizado) {
        return res.status(400).json({ message: "Colaborador no encontrado" });
      }
      const empresaActualizada = await Business.findOne({
        razonSocial: colaboradorActualizado.business,
      });

      boletaDePago.colaborador = colaborador;
      boletaDePago.situacionEspecial = colaboradorActualizado.situacionEspecial;
      boletaDePago.tipoTrabajador = colaboradorActualizado.tipoTrabajador || "Empleado";
      boletaDePago.situacionTrabajador = colaboradorActualizado.state;
      boletaDePago.fechaIngresoColaborador = colaboradorActualizado.dateStart;
      if (empresaActualizada) boletaDePago.empresaColaborador = empresaActualizada._id;
    }
    if (envio) boletaDePago.envio = envio;
    if (recepcion) boletaDePago.recepcion = recepcion;
    if (state) boletaDePago.state = state;
    if (diasTrabajados) boletaDePago.diasTrabajados = diasTrabajados;
    if (diasSubsidiados) boletaDePago.diasSubsidiados = diasSubsidiados;
    if (horasTrabajadas) boletaDePago.horasTrabajadas = horasTrabajadas;
    if (diasNoLaborales) boletaDePago.diasNoLaborales = diasNoLaborales;
    if (suspensionesLaborales !== undefined)
      boletaDePago.suspensionesLaborales = suspensionesLaborales;
    if (situacionTrabajador !== undefined)
      boletaDePago.situacionTrabajador = situacionTrabajador;
    if (tipoTrabajador !== undefined)
      boletaDePago.tipoTrabajador = tipoTrabajador;
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
