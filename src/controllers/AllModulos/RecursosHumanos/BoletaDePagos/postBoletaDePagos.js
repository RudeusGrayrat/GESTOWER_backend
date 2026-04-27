const BoletaDePagos = require("../../../../models/RecursosHumanos/BoletaDePago");
const generarCorrelativa = require("./correlativa");

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

    const boletaFound = await BoletaDePagos.findOne({
      fechaBoletaDePago,
      colaborador,
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
    const correlativa = await generarCorrelativa(fechaOperacionDate);
    if (!correlativa)
      return res.status(500).json({ message: "Error al generar correlativa" });
    const boleta = new BoletaDePagos({
      correlativa,
      fechaBoletaDePago,
      colaborador: colaborador._id,
      empresaColaborador: colaborador.business,
      fechaIngresoColaborador: colaborador?.dateStart,
      diasTrabajados,
      diasSubsidiados,
      horasTrabajadas,
      diasNoLaborales,
      remuneraciones,
      descuentosAlTrabajador,
      aportacionesDelEmpleador,
    });
    await boleta.save();
    return res.status(201).json({ message: "Boleta de pagos creada" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = postBoletaDePagos;
