const fs = require('fs').promises;
const path = require('path');
const ContratoAlmacen = require('../../../../models/AllModulos/Almacen/Contrato');
const Sede = require('../../../../models/AllModulos/Almacen/Sede');
const Stock = require('../../../../models/AllModulos/Almacen/Stock');

const extraerNumero = (codigo) => {
    const match = codigo ? codigo.match(/(\d+)$/) : null;
    return match ? parseInt(match[1], 10) : 0;
};

const obtenerFecha = (fechaJson) => {
    const [dia, mesStr, año] = fechaJson.split('.');
    const meses = {
        ENE: '01', FEB: '02', MAR: '03', ABR: '04', MAY: '05', JUN: '06',
        JUL: '07', AGO: '08', SEP: '09', OCT: '10', NOV: '11', DIC: '12',
    };
    const mes = meses[mesStr.toUpperCase()] || '01';
    return `${año}-${mes}-${dia.padStart(2, '0')}`;
};

function generarCodigoIngreso(fechaRecepcion, codigoOriginal, tipo) {
    let año = '';
    if (fechaRecepcion && fechaRecepcion.match(/\d{4}/)) {
        año = fechaRecepcion.match(/\d{4}/)[0].slice(-2);
    } else if (fechaRecepcion && fechaRecepcion.match(/\d{2}\.\w+\.\d{4}/)) {
        const partes = fechaRecepcion.split('.');
        if (partes.length === 3) año = partes[2].slice(-2);
    }
    if (!año) año = '00';

    const numMatch = codigoOriginal ? codigoOriginal.match(/(\d+)$/) : null;
    let numero = numMatch ? numMatch[1] : '0';
    numero = numero.padStart(5, '0');

    const entidad = tipo === 'pnp' ? 'PNP' : 'SUN';
    return `CI${año}-${entidad}${numero}`;
}

const getOrCreateSedeContrato = async (tipo) => {
    const sedeNombre = 'LURIN';
    const contratoNombre = tipo === 'pnp' ? 'PNP' : 'SUNAT';
    let sede = await Sede.findOne({ nombre: sedeNombre });
    if (!sede) throw new Error(`Sede ${sedeNombre} no encontrada`);
    let contrato = await ContratoAlmacen.findOne({ cliente: contratoNombre });
    if (!contrato) throw new Error(`Contrato ${contratoNombre} no encontrado`);
    return { sedeId: sede._id, contratoId: contrato._id };
};

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

        // Ordenar por fecha y luego por número
        stockData.sort((a, b) => {
            const fechaA = obtenerFecha(a["FECHA DE RECEPCIÓN"]);
            const fechaB = obtenerFecha(b["FECHA DE RECEPCIÓN"]);
            if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
            const numA = extraerNumero(a["CODIGO INTERNO"]);
            const numB = extraerNumero(b["CODIGO INTERNO"]);
            return numA - numB;
        });

        const { sedeId, contratoId } = await getOrCreateSedeContrato(tipo);

        let insertedCount = 0;

        // Insertamos uno por uno para respetar el orden y crear timestamps diferentes
        for (const item of stockData) {
            const fechaRecepcion = obtenerFecha(item["FECHA DE RECEPCIÓN"]);
            const codigoOriginal = item["CODIGO INTERNO"];
            const codigoIngreso = generarCodigoIngreso(fechaRecepcion, codigoOriginal, tipo);
            const cantidad = Number(item.CANTIDAD) || 0;

            const stock = new Stock({
                movimientoId: null,
                bienId: null,
                codigoIngreso,
                numeroDeActa: item["N° DE ACTA"] || '',
                item: item.ITEM ? Number(item.ITEM) : null,
                pesoNeto: '',
                pesoBruto: item["PESO (Kg)"] ? String(item["PESO (Kg)"]) : '',
                unidadDeMedida: item["UNIDAD DE MEDIDA"] || '',
                descripcion: item["DETALLE DEL MATERIAL INGRESADO"] || '',
                cantidadTotal: cantidad,
                cantidadDisponible: cantidad,
                fechaIngreso: fechaRecepcion,
                historial: [{
                    fecha: new Date(),   // se ejecutará en cada iteración, por lo que serán ligeramente diferentes
                    accion: 'IMPORTACIÓN',
                    cantidadIngresada: cantidad,
                    cantidadDisponible: cantidad,
                    cantidadTotal: cantidad,
                    ubicacion: '',
                    actualizadoPor: null,
                    correlativa: codigoIngreso
                }],
                estado: 'ACTIVO',
                sedeId,
                contratoId,
                ubicado: false,
                ubicaciones: []
            });

            await stock.save();
            insertedCount++;

            // Pequeña pausa de 1 ms para asegurar que el próximo `createdAt` sea diferente
            await new Promise(resolve => setTimeout(resolve, 1));
        }

        res.status(200).json({
            message: `✅ ${insertedCount} stocks importados correctamente en orden secuencial con timestamps únicos`,
            total: insertedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = importStockJson;