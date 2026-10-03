const path = require("path");
const BoletaDePagos = require("../../../../models/RecursosHumanos/BoletaDePago");
const DatosContables = require("../../../../models/RecursosHumanos/DatosContablesBoleta");
const convertDocx = require("../../../../utils/convertDocx");
const obtenerPlantillaLocal = require("../../../../utils/obtenerPlantillaLocal");

const nombresBoleta = {
  "TOWER AND TOWER S.A.": "TOWER AND TOWER S.A.",
  "LABORATORIO DE INSTRUMENTOS AMBIENTALES S.A.C.": "LABORATORIO DE INSTRUMENTOS AMBIENTALES S.A.C",
  "INVERSIONES LURIN S.A.C.": "INVERSIONES LURIN S.A.C",
  "ECOLOGY RESEARCH AND MENTORING S.C.R.L.": "ECOLOGY RESEARCH AND MENTORING S.R.L",
  "CORPORACION DE EMPRESAS DE SERVICIOS SOCIEDAD ANONIMA CERRADA - CORPEMSE S.A.C": "CORPORACION DE EMPRESAS Y SERVICIOS S.A.C",
};

const plantillaRespaldo = (razon = "") => {
  if (razon.includes("LABORATORIO") || razon.includes("LADIAMB")) return "BOLETA_LADIAMB_DOCX.docx";
  if (razon.includes("CORPEMSE")) return "BOLETA_CORPEMSE_DOCX.docx";
  if (razon.includes("ECOLOGY")) return "BOLETA_ECOLOGY_DOCX.docx";
  if (razon.includes("INVERSIONES LURIN")) return "BOLETA_INVERSIONES_LURIN_DOCX.docx";
  return "BOLETA_TOWER_DOCX.docx";
};

const generarWordBoleta = async (boletaId) => {
  const boleta = await BoletaDePagos.findById(boletaId).populate("colaborador").populate("empresaColaborador", "ruc razonSocial logo representative").lean();
  if (!boleta) throw Object.assign(new Error("Boleta no encontrada"), { status: 404 });
  if (!boleta.colaborador || !boleta.empresaColaborador) throw Object.assign(new Error("La boleta no tiene colaborador o empresa disponibles"), { status: 400 });

  const { colaborador, empresaColaborador: empresa } = boleta;
  const items = [...(boleta.remuneraciones || []), ...(boleta.descuentosAlTrabajador || []), ...(boleta.aportacionesDelEmpleador || [])];
  const codigos = [...new Set(items.map((item) => item.datosContables).filter(Boolean))];
  const catalogo = await DatosContables.find({ codigoPlame: { $in: codigos } }).lean();
  const conceptos = Object.fromEntries(catalogo.map((item) => [item.codigoPlame, item.concepto]));
  const monto = (value) => Number.parseFloat(value) || 0;
  const concepto = (item) => item.concepto || conceptos[item.datosContables] || "";
  const ingresos = (boleta.remuneraciones || []).map((item) => ({ tipo: "INGRESOS", codigo: item.datosContables || "", concepto: concepto(item), monto: monto(item.monto) }));
  const descuentos = (boleta.descuentosAlTrabajador || []).map((item) => ({ tipo: "APORTES DEL TRABAJADOR", codigo: item.datosContables || "", concepto: concepto(item), monto: monto(item.monto) }));
  const aportes = (boleta.aportacionesDelEmpleador || []).map((item) => ({ codigo: item.datosContables || "", concepto: concepto(item), monto: monto(item.monto) }));
  const suspensiones = (boleta.suspensionesLaborales || []).map((item) => ({ tipoSuspension: item.tipoSuspension || "NINGUNA", motivoSuspension: item.motivoSuspension || "NINGUNA", diasSuspension: Number.parseInt(item.diasSuspension, 10) || 0 }));
  const data = {
    ruc_empresa: empresa.ruc, razonSocial_empresa: empresa.razonSocial, nombre_empresa: nombresBoleta[empresa.razonSocial] || empresa.razonSocial || "",
    logo_empresa: empresa.logo, logo_encabezado: empresa.logo, firma: empresa.representative?.signature,
    fechaBoletaDePago: boleta.fechaBoletaDePago, situacionEspecial: boleta.situacionEspecial || "NINGUNA",
    tipoD: colaborador.documentType || "", numeroD: colaborador.documentNumber || "", colaborador: `${colaborador.lastname || ""} ${colaborador.name || ""}`.trim(),
    situacion: boleta.situacionTrabajador === "INACTIVO" ? "BAJA" : boleta.situacionTrabajador || colaborador.state || "",
    codigoSpp: boleta.codigoSpp || colaborador.codigoSpp || "", ingreso: boleta.fechaIngresoColaborador || colaborador.dateStart || "", regimen: colaborador.regimenPension || "",
    días: Number.parseInt(boleta.diasTrabajados, 10) || 0, noLaborados: Number.parseInt(boleta.diasNoLaborales, 10) || 0,
    diasSubsidiados: Number.parseInt(boleta.diasSubsidiados, 10) || 0, horas: Number.parseInt(boleta.horasTrabajadas, 10) || 0,
    tipoT: boleta.tipoTrabajador || colaborador.tipoTrabajador || "Empleado", suspensiones,
    tipoSuspension: suspensiones.map((item) => item.tipoSuspension).join("\n"), motivoSuspension: suspensiones.map((item) => item.motivoSuspension).join("\n"), diasSuspension: suspensiones.map((item) => item.diasSuspension).join("\n"),
    ingresos, descuentos, aportes,
    total: Number.parseFloat((ingresos.reduce((sum, item) => sum + item.monto, 0) - descuentos.reduce((sum, item) => sum + item.monto, 0)).toFixed(2)),
  };
  const global = await obtenerPlantillaLocal({ tipo: "BOLETA" });
  const templatePath = global?.ruta || path.join(process.cwd(), "templates", plantillaRespaldo(empresa.razonSocial));
  const wordBuffer = await convertDocx(data, templatePath, { marcaAguaBoleta: true });
  return { wordBuffer, nombre: `Boleta_${boleta.correlativa || boleta._id}.docx` };
};

module.exports = { generarWordBoleta };
