const BoletaDePagos = require("../../../../models/RecursosHumanos/BoletaDePago");
const Business = require("../../../../models/RecursosHumanos/Business");
const generarCorrelativa = require("./correlativa");
const normalizarConceptosBoleta = require("./normalizarConceptosBoleta");

const postBoletaDePagos = async (req, res) => {
  const {
    fechaBoletaDePago,
    colaborador,
    diasTrabajados,
    diasSubsidiados,
    horasTrabajadas,
    diasNoLaborales,
    remuneraciones,
    descuentosAlTrabajador,
    aportacionesDelEmpleador,
  } = req.body;
  try {
    const [month, year] = fechaBoletaDePago.split("/");
    const fechaOperacionDate = new Date(`${year}/${month}`);
    const idColaborador = colaborador._id;
    if (!idColaborador) {
      return res.status(400).json({ message: "Colaborador es requerido" });
    }
    const boletaFound = await BoletaDePagos.findOne({
      fechaBoletaDePago,
      colaborador: idColaborador,
    });

    if (boletaFound) {
      return res.status(400).json({
        message: "La Boleta de pagos del colaborador en esa fecha ya existe",
      });
    }
    if (
      !fechaBoletaDePago ||
      !colaborador ||
      !diasTrabajados ||
      !diasSubsidiados ||
      !horasTrabajadas ||
      !diasNoLaborales ||
      !remuneraciones ||
      !descuentosAlTrabajador ||
      !aportacionesDelEmpleador
    ) {
      return res
        .status(400)
        .json({ message: "Por favor llena todos los campos" });
    }
    const business = colaborador.business;
    if (!business)
      return res.status(400).json({ message: "El colaborador no tiene empresa asignada" });
    const correlativa = await generarCorrelativa(fechaOperacionDate);
    if (!correlativa)
      return res.status(500).json({ message: "Error al generar correlativa" });
    const findBusiness = await Business.findOne({ razonSocial: business });
    if (!findBusiness)
      return res.status(400).json({ message: "No se encontró la empresa del colaborador" });
    const conceptosBoleta = await normalizarConceptosBoleta({
      remuneraciones,
      descuentosAlTrabajador,
      aportacionesDelEmpleador,
    });

    const boleta = new BoletaDePagos({
      correlativa,
      fechaBoletaDePago,
      colaborador: idColaborador,
      situacionEspecial: colaborador?.situacionEspecial,
      empresaColaborador: findBusiness._id,
      fechaIngresoColaborador: colaborador?.dateStart,
      diasTrabajados,
      diasSubsidiados,
      horasTrabajadas,
      diasNoLaborales,
      remuneraciones: conceptosBoleta.remuneraciones,
      descuentosAlTrabajador: conceptosBoleta.descuentosAlTrabajador,
      aportacionesDelEmpleador: conceptosBoleta.aportacionesDelEmpleador,
    });
    await boleta.save();
    return res.status(201).json({ message: "Boleta de pagos creada" });
  } catch (error) {
    console.error("Error al crear Boleta de pagos:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = postBoletaDePagos;
