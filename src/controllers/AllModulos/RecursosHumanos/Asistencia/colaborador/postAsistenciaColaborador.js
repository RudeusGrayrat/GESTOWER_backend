const AsistenciaColaborador = require("../../../../../models/RecursosHumanos/AsistenciaColaborador");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

const updateAsistenciaGestower = async (req, res) => {
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
    estado,
    observaciones,
  } = req.body;

  try {
    if (!colaborador) {
      return res.status(400).json({ message: "El colaborador es obligatorio" });
    }

    const findAsistenciaColaborador = await AsistenciaColaborador.findOne({
      colaborador,
      fecha,
    }).populate("colaborador", "name lastname");

    if (findAsistenciaColaborador) {
      return res.status(404).json({ message: "Esta asistencia ya existe" });
    }

    const nombre = `${findAsistenciaColaborador.colaborador.name} ${findAsistenciaColaborador.colaborador.lastname}`;

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

    if (colaborador) findAsistenciaColaborador.colaborador = colaborador;
    if (fecha) findAsistenciaColaborador.fecha = fecha;
    if (observaciones) findAsistenciaColaborador.observaciones = observaciones;
    if (estado) findAsistenciaColaborador.estado = estado;

    await findAsistenciaColaborador.save();

    return res.status(200).json({ message: `Asistencia de ${nombre} actualizada` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = updateAsistenciaGestower;