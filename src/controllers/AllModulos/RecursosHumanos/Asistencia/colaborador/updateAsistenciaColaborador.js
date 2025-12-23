const Employee = require("../../../../../models/Employees/Employee");
const AsistenciaColaborador = require("../../../../../models/RecursosHumanos/AsistenciaColaborador");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);
const updateAsistenciaColaborador = async (req, res) => {
  const {
    colaborador,
    fecha,
    ingreso,
    ingresoSede,
    salida,
    salidaSede,
    inicioAlmuerzo,
    almuerzoSede,
    finAlmuerzo,
    finAlmuerzoSede,
    observaciones,
    dni,
  } = req.body;
  try {
    let findAsistenciaColaborador;
    let ingresoConDni = false;

    if (dni) {
      const findColaborador = await Employee.findOne({ documentNumber: dni });
      if (!findColaborador) {
        return res.status(404).json({ message: "Colaborador no encontrado" });
      }
      findAsistenciaColaborador = await AsistenciaColaborador.findOne({
        colaborador: findColaborador._id,
        fecha: fecha,
      });

      ingresoConDni = true; // Marcar que se ingresó con DNI
    } else if (colaborador) {
      findAsistenciaColaborador = await AsistenciaColaborador.findOne({
        colaborador: colaborador,
        fecha: fecha,
      });
    }

    if (!findAsistenciaColaborador) {
      return res
        .status(404)
        .json({ message: "No se encontró esta asistencia" });
    }

    if (ingresoConDni) {
      if (inicioAlmuerzo && findAsistenciaColaborador.inicioAlmuerzo)
        return res.status(400).json({
          message: "No se puede modificar el Inicio de Almuerzo",
        });
      if (finAlmuerzo && findAsistenciaColaborador.finAlmuerzo)
        return res.status(400).json({
          message: "No se puede modificar el Fin de Almuerzo",
        });
      if (salida && findAsistenciaColaborador.salida)
        return res.status(400).json({
          message: "No se puede modificar la Salida",
        });
    }

    if (ingreso) {
      let minTarde = 0;
      let state;
      const horaLimite = dayjs("08:00 AM", "hh:mm A");
      const horaIngreso = dayjs(ingreso, "hh:mm A");

      if (horaIngreso.isAfter(horaLimite)) {
        state = "TARDANZA";
        minTarde = horaIngreso.diff(horaLimite, "minute");
      } else {
        state = "PRESENTE";
      }
      findAsistenciaColaborador.ingreso = ingreso;
      findAsistenciaColaborador.minTarde = minTarde;
      findAsistenciaColaborador.estado = state;

      if (ingresoSede) findAsistenciaColaborador.ingresoSede = ingresoSede;
    }

    if (salida) {
      let horasExtras = 0;
      const fechaValida = dayjs(fecha, "DD/MM/YYYY", true);
      if (!fechaValida.isValid()) {
        return res.status(400).json({ message: "Fecha inválida" });
      }
      const diaSemana = fechaValida.day();
      const horaLimiteSalida =
        diaSemana === 6
          ? dayjs("01:30 PM", "hh:mm A")
          : dayjs("06:00 PM", "hh:mm A");

      const horaSalida = dayjs(salida, "hh:mm A");
      if (horaSalida.isAfter(horaLimiteSalida)) {
        horasExtras = horaSalida.diff(horaLimiteSalida, "minute") + 30;
      }
      findAsistenciaColaborador.salida = salida;
      findAsistenciaColaborador.minExtras = horasExtras;

      if (salidaSede) {
        findAsistenciaColaborador.salidaSede = salidaSede;
      }
    }
    if (colaborador) findAsistenciaColaborador.colaborador = colaborador;
    if (fecha) findAsistenciaColaborador.fecha = fecha;
    if (inicioAlmuerzo) {
      findAsistenciaColaborador.inicioAlmuerzo = inicioAlmuerzo;
      if (almuerzoSede) findAsistenciaColaborador.almuerzoSede = almuerzoSede;
    }
    if (finAlmuerzo) {
      findAsistenciaColaborador.finAlmuerzo = finAlmuerzo;
      if (finAlmuerzoSede)
        findAsistenciaColaborador.finAlmuerzoSede = finAlmuerzoSede;
    }
    if (observaciones) findAsistenciaColaborador.observaciones = observaciones;

    await findAsistenciaColaborador.save();

    return res
      .status(200)
      .json({ message: "Asistencia del colaborador actualizada" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = updateAsistenciaColaborador;
