const Employee = require("../../../../../models/Employees/Employee");
const AsistenciaColaborador = require("../../../../../models/RecursosHumanos/AsistenciaColaborador");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");

dayjs.extend(customParseFormat);
const postAsistenciaColaborador = async (req, res) => {
  try {
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
      estado,
      dni,
    } = req.body;

    if (!fecha) {
      return res.status(400).json({ message: "La Fecha es obligatoria" });
    }
    if (!colaborador && !dni) {
      return res
        .status(400)
        .json({ message: "El colaborador o el DNI es obligatorio" });
    }

    let asistenciaExistente;
    let findColaborador = null;

    if (colaborador) {
      asistenciaExistente = await AsistenciaColaborador.findOne({
        colaborador,
        fecha,
      });
    } else if (dni) {
      findColaborador = await Employee.findOne({ documentNumber: dni });

      if (!findColaborador) {
        return res
          .status(404)
          .json({ message: "No se encontró un colaborador con este DNI" });
      }

      asistenciaExistente = await AsistenciaColaborador.findOne({
        colaborador: findColaborador._id,
        fecha,
      });
    }

    if (!asistenciaExistente && !ingreso) {
      return res.status(400).json({
        message: "Debe registrar el ingreso antes de marcar otros datos.",
      });
    }

    if (asistenciaExistente) {
      return res.status(400).json({
        message: "Ya existe una asistencia para este colaborador en esta fecha",
      });
    }
    let state;
    let minTarde = 0;

    if (!estado) {
      const horaLimite = dayjs("08:00 AM", "hh:mm A");
      const horaIngreso = dayjs(ingreso, "hh:mm A");

      if (horaIngreso.isAfter(horaLimite)) {
        state = "TARDANZA";
        minTarde = horaIngreso.diff(horaLimite, "minute");
      } else {
        state = "PRESENTE";
      }
    }
    let horasExtras = 0;

    if (salida) {
      const diaSemana = dayjs(fecha).day();
      const horaLimiteSalida =
        diaSemana === 6
          ? dayjs("01:30 PM", "hh:mm A")
          : dayjs("06:00 PM", "hh:mm A");

      const horaSalida = dayjs(salida, "hh:mm A");
      if (horaSalida.isAfter(horaLimiteSalida)) {
        horasExtras = horaSalida.diff(horaLimiteSalida, "minute") + 30;
      }
    }

    const asistencia = new AsistenciaColaborador({
      colaborador: colaborador || findColaborador._id,
      fecha,
      ingreso,
      ingresoSede,
      salida,
      salidaSede,
      inicioAlmuerzo,
      almuerzoSede,
      finAlmuerzo,
      finAlmuerzoSede,
      estado: estado || state,
      minExtras: parseInt(horasExtras),
      minTarde: parseInt(minTarde),
      observaciones,
    });

    await asistencia.save();
    return res.status(200).json({
      message: "Asistencia creada correctamente",
      asistencia,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Error inesperado en el servidor." });
  }
};

module.exports = postAsistenciaColaborador;
