// controllers/Stock/postStockJson.js
const fs = require('fs').promises;
const path = require('path');
const ContratoAlmacen = require('../../../../models/AllModulos/Almacen/Contrato');
const Sede = require('../../../../models/AllModulos/Almacen/Sede');
const Movimiento = require('../../../../models/AllModulos/Almacen/Movimiento');
const Stock = require('../../../../models/AllModulos/Almacen/Stock');
const Employee = require('../../../../models/Employees/Employee');

// ----------------------------------------------------------------------
// FUNCIONES AUXILIARES
// ----------------------------------------------------------------------
const obtenerFecha = (fechaJson) => {
    if (!fechaJson) return '';
    const [dia, mesStr, año] = fechaJson.split('.');
    const meses = {
        ENE: '01', FEB: '02', MAR: '03', ABR: '04', MAY: '05', JUN: '06',
        JUL: '07', AGO: '08', SEP: '09', OCT: '10', NOV: '11', DIC: '12',
    };
    const mes = meses[mesStr?.toUpperCase()] || '01';
    return `${año}-${mes}-${dia.padStart(2, '0')}`;
};

// Extrae el número de los últimos dígitos del código interno (ej. CIPNP001 -> 1, CIPNP092 -> 92)
const extraerNumero = (codigo) => {
    const match = codigo ? String(codigo).match(/(\d+)$/) : null;
    return match ? parseInt(match[1], 10) : 0;
};

// Genera la correlativa del movimiento (y también se usará como codigoIngreso del stock)
function generarCorrelativaMovimiento(fechaRecepcion, numeroOriginal, tipo) {
    let año = '';
    if (fechaRecepcion && fechaRecepcion.match(/\d{4}/)) {
        año = fechaRecepcion.match(/\d{4}/)[0].slice(-2);
    } else if (fechaRecepcion && fechaRecepcion.match(/\d{2}\.\w+\.\d{4}/)) {
        const partes = fechaRecepcion.split('.');
        if (partes.length === 3) año = partes[2].slice(-2);
    }
    if (!año) año = '00';
    const numeroFormateado = String(numeroOriginal).padStart(5, '0');
    const entidad = tipo === 'pnp' ? 'PNP' : 'SUN';
    return `CI${año}-${entidad}${numeroFormateado}`;
}

const getOrCreateSedeContrato = async (tipo) => {
    const sedeNombre = 'LURIN';
    const contratoNombre = tipo === 'pnp' ? 'PNP' : 'SUNAT';
    const sede = await Sede.findOne({ nombre: sedeNombre });
    if (!sede) throw new Error(`Sede ${sedeNombre} no encontrada`);
    const contrato = await ContratoAlmacen.findOne({ cliente: contratoNombre });
    if (!contrato) throw new Error(`Contrato ${contratoNombre} no encontrado`);
    return { sedeId: sede._id, contratoId: contrato._id, contratoNombre };
};


// ----------------------------------------------------------------------
// CONTROLADOR PRINCIPAL
// ----------------------------------------------------------------------
const importStockJson = async (req, res) => {
    try {
        const { tipo } = req.query;
        if (!['sunat', 'pnp'].includes(tipo)) {
            return res.status(400).json({ error: 'tipo debe ser sunat o pnp' });
        }

        const archivo = tipo === 'sunat' ? 'stock_matpel.json' : 'stock_pnp.json';
        const filePath = path.join(__dirname, archivo);
        const data = await fs.readFile(filePath, 'utf8');
        let stockData = JSON.parse(data);

        // Ordenar para coherencia (opcional)
        stockData.sort((a, b) => {
            const fechaA = obtenerFecha(a["FECHA DE RECEPCIÓN"]);
            const fechaB = obtenerFecha(b["FECHA DE RECEPCIÓN"]);
            if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
            const numA = extraerNumero(a["CODIGO INTERNO"]);
            const numB = extraerNumero(b["CODIGO INTERNO"]);
            return numA - numB;
        });

        const { sedeId, contratoId, contratoNombre } = await getOrCreateSedeContrato(tipo);

        // Agrupar por CODIGO INTERNO
        const grupos = new Map();
        for (const item of stockData) {
            const codigo = item["CODIGO INTERNO"];
            if (!codigo) continue;
            if (!grupos.has(codigo)) grupos.set(codigo, []);
            grupos.get(codigo).push(item);
        }

        let insertedCount = 0;

        for (const [codigoInterno, items] of grupos.entries()) {
            // Ordenar por ITEM dentro del grupo
            items.sort((a, b) => (a.ITEM || 0) - (b.ITEM || 0));

            const primerItem = items[0];
            const fechaRecepcionStr = primerItem["FECHA DE RECEPCIÓN"];
            const fechaISO = obtenerFecha(fechaRecepcionStr);
            const numeroExtraido = extraerNumero(codigoInterno);

            // Generar la correlativa del movimiento
            const correlativaMov = generarCorrelativaMovimiento(fechaRecepcionStr, numeroExtraido, tipo);

            // Construir los bienes del movimiento
            const bienes = items.map((item, idx) => {
                let itemNumber;
                const rawItem = item.ITEM;
                if (rawItem !== undefined && rawItem !== null && rawItem !== '') {
                    const num = Number(rawItem);
                    if (!isNaN(num)) itemNumber = num;
                    else itemNumber = idx + 1;
                } else {
                    itemNumber = idx + 1;
                }
                return {
                    item: itemNumber,
                    descripcion: item["DETALLE DEL MATERIAL INGRESADO"] || '',
                    unidadDeMedida: item["UNIDAD DE MEDIDA"] || '',
                    cantidadIngresada: Number(item.CANTIDAD) || 0,
                    cantidadDisponible: Number(item.CANTIDAD) || 0,
                    stockFinal: Number(item.CANTIDAD) || 0,
                    pesoBruto: item["PESO (Kg)"] ? String(item["PESO (Kg)"]) : '',
                    pesoNeto: '',
                };
            });

            // Crear el movimiento
            const movimiento = new Movimiento({
                movimiento: 'INGRESO',
                correlativa: correlativaMov,
                numeroDeActa: primerItem["N° DE ACTA"] || '',
                contribuyente: primerItem.CONTRIBUYENTE || 'SIN CONTRIBUYENTE',
                numeroDocumento: Number(primerItem["DNI / RUC"]) || 0,
                datosGenerales: {
                    fecha: fechaISO,
                    horaIngreso: '00:00',
                    recepcionadoPor: 'Sistema',
                    dniRecepcionadoPor: '00000000',
                    responsableEntrega: 'Sistema',
                    registroOCIP: '000000',
                    estadoActa: 'IMPORTADO'
                },
                descripcionBienes: bienes,
                sedeId,
                contratoId,
                creadoPor: null,
                estado: 'APROBADO'
            });
            await movimiento.save();

            // ✅ Obtener los bienes con sus _id ya generados
            const bienesGuardados = movimiento.descripcionBienes;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const bien = bienesGuardados[i];
                const cantidad = Number(item.CANTIDAD) || 0;

                const stock = new Stock({
                    movimientoId: movimiento._id,
                    bienId: bien._id,   // ✅ ahora es un ObjectId válido
                    codigoIngreso: correlativaMov,
                    numeroDeActa: item["N° DE ACTA"] || '',
                    item: bien.item,
                    pesoNeto: '',
                    pesoBruto: item["PESO (Kg)"] ? String(item["PESO (Kg)"]) : '',
                    unidadDeMedida: item["UNIDAD DE MEDIDA"] || '',
                    descripcion: item["DETALLE DEL MATERIAL INGRESADO"] || '',
                    cantidadTotal: cantidad,
                    cantidadDisponible: cantidad,
                    fechaIngreso: fechaISO,
                    historial: [{
                        fecha: new Date(),
                        accion: 'IMPORTACIÓN',
                        cantidadIngresada: cantidad,
                        cantidadDisponible: cantidad,
                        cantidadTotal: cantidad,
                        ubicacion: '',
                        actualizadoPor: null,
                        correlativa: correlativaMov
                    }],
                    estado: 'ACTIVO',
                    sedeId,
                    contratoId,
                    ubicado: false,
                    ubicaciones: []
                });
                await stock.save();
                insertedCount++;
                await new Promise(resolve => setTimeout(resolve, 1));
            }

        }

        res.status(200).json({
            message: `✅ ${insertedCount} stocks importados correctamente, agrupados por código interno`,
            total: insertedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = importStockJson;