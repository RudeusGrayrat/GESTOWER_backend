const Employee = require("../../../../../models/Employees/Employee");
const AsistenciaColaborador = require("../../../../../models/RecursosHumanos/AsistenciaColaborador");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

const updateAsistenciaColaborador = async (req, res) => {
  const {
    fecha,
    ingreso,
    ingresoSede,
    salida,
    salidaSede,
    inicioAlmuerzo,
    almuerzoSede,
    finAlmuerzo,
    finAlmuerzoSede,
    estado,
    observaciones,
    dni,
  } = req.body;

  try {
    if (!dni) {
      return res.status(400).json({ message: "El DNI es obligatorio" });
    }

    const findColaborador = await Employee.findOne({ documentNumber: dni });
    if (!findColaborador) {
      return res.status(404).json({ message: "Colaborador no encontrado" });
    }

    const findAsistenciaColaborador = await AsistenciaColaborador.findOne({
      colaborador: findColaborador._id,
      fecha: fecha,
    });

    if (!findAsistenciaColaborador) {
      return res.status(404).json({ message: "No se encontró esta asistencia" });
    }
    const fechaValida = dayjs(fecha, "DD/MM/YYYY", true);
    if (!fechaValida.isValid()) {
      return res.status(400).json({ message: "Fecha inválida" });
    }

    const diaSemana = fechaValida.day();
    const sabado = diaSemana === 6;
    const nombre = `${findColaborador.name} ${findColaborador.lastname}`;

    // Validaciones de orden y duplicados
    if (ingreso && findAsistenciaColaborador.ingreso)
      return res.status(400).json({ message: `${nombre} ya marcó el Ingreso` });

    if (inicioAlmuerzo && findAsistenciaColaborador.inicioAlmuerzo)
      return res.status(400).json({ message: `${nombre} ya marcó el Inicio de Almuerzo` });

    if (finAlmuerzo && findAsistenciaColaborador.finAlmuerzo)
      return res.status(400).json({ message: `${nombre} ya marcó el Fin de Almuerzo` });

    if (salida) {
      if (!findAsistenciaColaborador.inicioAlmuerzo && !sabado)
        return res.status(400).json({ message: `${nombre} debe marcar el Inicio de Almuerzo antes de la Salida` });
      if (!findAsistenciaColaborador.finAlmuerzo && !sabado)
        return res.status(400).json({ message: `${nombre} debe marcar el Fin de Almuerzo antes de la Salida` });
      if (findAsistenciaColaborador.salida)
        return res.status(400).json({ message: `${nombre} ya marcó la Salida` });
    }

    // Actualizar ingreso
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

    // Actualizar salida
    if (salida) {
      let horasExtras = 0;
      const fechaValida = dayjs(fecha, "DD/MM/YYYY", true);
      if (!fechaValida.isValid()) {
        return res.status(400).json({ message: "Fecha inválida" });
      }

      const diaSemana = fechaValida.day();
      const horaSalidaNormal =
        diaSemana === 6
          ? dayjs("01:00 PM", "hh:mm A")
          : dayjs("05:30 PM", "hh:mm A");

      const horaLimiteTolerancia = horaSalidaNormal.add(5, "minute");
      const horaSalida = dayjs(salida, "hh:mm A");

      if (horaSalida.isAfter(horaLimiteTolerancia)) {
        horasExtras = horaSalida.diff(horaSalidaNormal, "minute");
      }

      findAsistenciaColaborador.salida = salida;
      findAsistenciaColaborador.minExtras = horasExtras;
      if (salidaSede) findAsistenciaColaborador.salidaSede = salidaSede;
    }

    // Actualizar almuerzo
    if (inicioAlmuerzo) {
      findAsistenciaColaborador.inicioAlmuerzo = inicioAlmuerzo;
      if (almuerzoSede) findAsistenciaColaborador.almuerzoSede = almuerzoSede;
    }
    if (finAlmuerzo) {
      findAsistenciaColaborador.finAlmuerzo = finAlmuerzo;
      if (finAlmuerzoSede) findAsistenciaColaborador.finAlmuerzoSede = finAlmuerzoSede;
    }

    if (observaciones) findAsistenciaColaborador.observaciones = observaciones;
    if (estado) findAsistenciaColaborador.estado = estado;

    await findAsistenciaColaborador.save();

    return res.status(200).json({ message: `Asistencia de ${nombre} actualizada` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = updateAsistenciaColaborador;