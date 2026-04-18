const dayjs = require("dayjs");
const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const convertToPdf = require("../../../../utils/convertToPdf");
const convertDocx = require("../../../../utils/convertDocx");


const generarPDFManifiesto = async (req, res) => {
    try {
        const { id } = req.params;
        const { data } = req.query;
        const rootPath = process.cwd();
        const templatePath = path.join(rootPath, "templates", "PLANTILLA_MANIFIESTO_WORD_PENDIENTE.docx");
        if (!id) {
            console.warn("ID del manifiesto no proporcionado en la solicitud");
            return res.status(400).json({ message: "ID del manifiesto es obligatorio", type: "Advertencia" });
        }

        const findManifiesto = await Manifiesto.findById(id);
        if (!findManifiesto) {
            console.warn(`Manifiesto con ID ${id} no encontrado en la base de datos`);
            return res.status(404).json({ message: "Manifiesto no encontrado", type: "Error" });
        }
        let dataDocx;
        if (data) {
            dataDocx = {
                ...data,
            }
        } else {
            const safe = (value) => {
                if (value === undefined || value === null) return "";
                if (typeof value === 'string') return value;
                if (typeof value === 'number') return value.toString();
                if (typeof value === 'boolean') return value ? 'X' : '';
                return String(value);
            };
            const check = (condition) => condition ? 'X' : '';
            const fechaFormat = (fecha) => fecha ? dayjs(fecha).format("DD/MM/YYYY") : "";
            const generador = findManifiesto?.generadorId || {};
            const planta = findManifiesto?.planta || {};
            const responsableGestion = findManifiesto?.responsableGestion || {};
            const plantaUbigeo = planta.ubigeoId || {};
            const transportista = findManifiesto?.transportistaId || {};
            const transportistaUbigeo = transportista.ubigeoId || {};
            const destinoFinal = findManifiesto?.destinoFinal || {};
            const destino = findManifiesto?.destinoId || {};
            const destinoUbigeo = destino.ubigeoId || {};

            // Datos principales
            const residuo = findManifiesto?.residuo || {};
            const peligrosidad = findManifiesto?.peligrosidad || {};
            const transporte = findManifiesto?.transporte || {};
            const referendoEntrega = findManifiesto?.referendoEntrega || {};
            const referendoRecepcion = findManifiesto?.referendoRecepcion || {};
            const otrosManejos = findManifiesto?.otrosManejos || {}; // OBJETO
            const otrasObligaciones = findManifiesto?.otrasObligaciones || {};

            // Contingencias (si existen en transportista)
            const contingencias = transportista.contingencias || {};
            dataDocx = {
                // ===== ENCABEZADO =====
                numero_manifiesto: safe(findManifiesto?.numeroManifiesto),
                año: safe(findManifiesto?.año),
                mes: safe(findManifiesto?.mes ? findManifiesto?.mes.toUpperCase() : ""),

                // ===== GENERADOR =====
                razon_social_generador: safe(generador.razonSocial),
                ruc_generador: safe(generador.ruc),
                correo_generador: safe(generador.correoElectronico),
                telefono_generador: safe(generador.telefono),
                representante_legal_generador: safe(generador.representanteLegal),
                dni_representante_generador: safe(generador.dniRepresentante),

                // ===== PLANTA =====
                denominacion_planta: safe(planta.denominacion),
                tipo_planta: safe(planta.tipoPlanta),
                direccion_planta: safe(planta.direccion),
                ubigeo_planta: safe(plantaUbigeo.codigo),
                distrito: safe(plantaUbigeo.distrito),
                provincia: safe(plantaUbigeo.provincia),
                departamento: safe(plantaUbigeo.departamento),
                coordenada_norte: safe(planta.coordenadasUtm?.norte),
                coordenada_este: safe(planta.coordenadasUtm?.este),
                coordenada_zona: safe(planta.coordenadasUtm?.zona),
                actividad_economica: safe(planta.actividadEconomica),
                sector: safe(planta.sector),
                responsable_gestion: safe(responsableGestion?.nombreResponsable),
                cargo_responsable: safe(responsableGestion?.cargoResponsable),
                dni_responsable: safe(responsableGestion?.dniResponsable),
                correo_responsable: safe(responsableGestion?.correoResponsable),
                telefono_responsable: safe(responsableGestion?.telefonoResponsable),

                // ===== IGA =====
                tiene_iga_si: check(planta.tieneIga === true),
                tiene_iga_no: check(planta.tieneIga === false || planta.tieneIga === undefined || planta.tieneIga === null),
                institucion_aprueba: safe(planta.institucionApruebaIga),
                fecha_aprobacion_iga: fechaFormat(planta.fechaAprobacionIga),
                numero_resolucion: safe(planta.numeroResolucionIga),

                // ===== RESIDUO =====
                descripcion_residuo: safe(residuo.descripcion),
                cantidad_total: safe(residuo.cantidadTotal),
                estado_solido: check(residuo.estadoFisico === 'SOLIDO'),
                estado_semisolido: check(residuo.estadoFisico === 'SEMISOLIDO'),
                estado_liquido: check(residuo.estadoFisico === 'LIQUIDO'),
                estado_gas: check(residuo.estadoFisico === 'GAS'),
                tipo_recipiente: safe(residuo.tipoRecipiente),
                material_recipiente: safe(residuo.materialRecipiente),
                numero_recipientes: safe(residuo.numeroRecipientes || 1),

                // ===== BASILEA =====
                basilea_a1: check(residuo.codigoBasilea === 'A1'),
                basilea_a2: check(residuo.codigoBasilea === 'A2'),
                basilea_a3: check(residuo.codigoBasilea === 'A3'),
                basilea_a4: check(residuo.codigoBasilea === 'A4'),
                subcodigo_basilea: safe(residuo.subcodigoBasilea),
                informacion_adicional: safe(residuo.informacionAdicional),

                // ===== PELIGROSIDAD =====
                explosivos: check(peligrosidad.explosivos),
                oxidantes: check(peligrosidad.oxidantes),
                gases_toxicos: check(peligrosidad.gasesToxicos),
                liquidos_inflamables: check(peligrosidad.liquidosInflamables),
                peroxidos_organicos: check(peligrosidad.peroxidosOrganicos),
                toxicos_cronicos: check(peligrosidad.toxicosCronicos),
                solidos_inflamables: check(peligrosidad.solidosInflamables),
                toxicos_agudos: check(peligrosidad.toxicosAgudos),
                ecotoxicos: check(peligrosidad.ecotoxicos),
                combustion_espontanea: check(peligrosidad.combustionEspontanea),
                sustancias_infecciosas: check(peligrosidad.sustanciasInfecciosas),
                sustancias_secundarias: check(peligrosidad.sustanciasSecundarias),
                gases_inflamables_agua: check(peligrosidad.gasesInflamablesAgua),
                corrosivos: check(peligrosidad.corrosivos),
                otros_peligros: safe(peligrosidad.otros),
                otros_otros_peligros: check(peligrosidad.otros && peligrosidad.otros !== ''),

                // ===== TRANSPORTISTA =====
                razon_social_transportista: safe(transportista.razonSocial),
                ruc_transportista: safe(transportista.ruc),
                registro_eors: safe(transportista.registroEors),
                autorizacion_municipal: safe(transportista.autorizacionMunicipal),
                documento_ruta: safe(transportista.documentoRuta),
                direccion_transportista: safe(transportista.direccion),
                distrito_transportista: safe(transportistaUbigeo.distrito),
                provincia_transportista: safe(transportistaUbigeo.provincia),
                departamento_transportista: safe(transportistaUbigeo.departamento),
                correo_transportista: safe(transportista.correoElectronico),
                telefono_transportista: safe(transportista.telefono),
                representante_legal_transportista: safe(transportista.representanteLegal?.nombre),
                dni_representante_transportista: safe(transportista.representanteLegal?.dni),
                responsable_tecnico_transportista: safe(transportista.responsableTecnico?.nombre),
                numero_colegiatura: safe(transportista.responsableTecnico?.numeroColegiatura),

                // ===== DATOS DEL VIAJE =====
                nombre_conductor: safe(transporte.nombreConductor),
                tipo_vehiculo: safe(transporte.tipoVehiculo),
                placa_vehiculo: safe(transporte.placaVehiculo),
                fecha_recepcion: fechaFormat(transporte.fechaRecepcion),
                cantidad_recibida: safe(transporte.cantidadRecibida),
                observaciones_transporte: safe(transporte.observaciones),

                // ===== REFERENDO ENTREGA =====
                nombre_generador_firma: safe(referendoEntrega.generadorResponsableManejo),
                firma_generador: safe(referendoEntrega.firmaGenerador),
                nombre_transportista_firma: safe(referendoEntrega.responsableEors),
                firma_transportista: safe(referendoEntrega.firmaResponsableEors),
                dni_transportista_firma: safe(referendoEntrega.dniResponsableEors),
                cargo_transportista_firma: safe(referendoEntrega.cargoResponsableEors),
                fecha_hora_entrega: fechaFormat(referendoEntrega.fechaHora),

                // ===== DESTINO (tipo de manejo) =====
                tratamiento: check(destinoFinal.tipoManejo === 'TRATAMIENTO'),
                valorizacion: check((destinoFinal.tipoManejo === "VALORIZACIÓN" || destinoFinal.tipoManejo === "VALORIZACION")),
                disposicion_final: check(destinoFinal.tipoManejo === 'DISPOSICION FINAL'),

                razon_social_destino: safe(destino.razonSocial),
                ruc_destino: safe(destino.ruc),
                codigo_registro_eors_destino: safe(destino.codigoRegistroEors),
                autorizacion_municipal_destino: safe(destino.autorizacionMunicipal),
                direccion_destino: safe(destino.direccion),
                distrito_destino: safe(destinoUbigeo.distrito),
                provincia_destino: safe(destinoUbigeo.provincia),
                departamento_destino: safe(destinoUbigeo.departamento),
                correo_destino: safe(destino.correoElectronico),
                telefono_destino: safe(destino.telefono),
                representante_legal_destino: safe(destino.representanteLegal?.nombre),
                dni_representante_destino: safe(destino.representanteLegal?.dni),
                responsable_tecnico_destino: safe(destino.responsableTecnico?.nombre),
                numero_colegiatura_destino: safe(destino.responsableTecnico?.numeroColegiatura),
                cantidad_entregada: safe(destinoFinal.cantidadEntregada),
                observaciones_destino: safe(destinoFinal.observaciones),

                // ===== REFERENDO RECEPCIÓN =====
                nombre_destino_firma: safe(referendoRecepcion.responsableEorsDestino),
                firma_destino: safe(referendoRecepcion.firmaGenerador), // el campo se llama firmaGenerador en el modelo
                dni_destino_firma: safe(referendoRecepcion.dniResponsableEorsDestino),
                cargo_destino_firma: safe(referendoRecepcion.cargoResponsableEorsDestino),
                fecha_hora_recepcion: fechaFormat(referendoRecepcion.fechaHora),

                // ===== 3.3 OTROS (objeto otrosManejos) =====
                otros_comercializacion: check(otrosManejos.comercializacion),
                otros_exportacion: check(otrosManejos.exportacion),
                otros_otro: check(otrosManejos.otro),
                razon_social_receptor: safe(otrosManejos.razonSocialReceptor),
                ruc_receptor: safe(otrosManejos.rucReceptor),
                correo_receptor: safe(otrosManejos.correoReceptor),
                telefono_receptor: safe(otrosManejos.telefonoReceptor),
                tipo_manejo_otro: safe(otrosManejos.tipoManejo),
                direccion_destino_otro: safe(otrosManejos.direccionDestino),
                documento_aprueba: safe(otrosManejos.documentoAprueba),

                // ===== CONTINGENCIAS (desde transportista) =====
                derrame: safe(contingencias.derrame),
                infiltracion: safe(contingencias.infiltracion),
                incendio: safe(contingencias.incendio),
                explosion: safe(contingencias.explosion),
                otros_accidentes: safe(contingencias.otros),

                // ===== OTRAS OBLIGACIONES (antes "devolución") =====
                nombre_representante_eors: safe(otrasObligaciones.representanteEors),
                firma_representante_eors: safe(otrasObligaciones.firmaRepresentanteEors),
                dni_representante_eors: safe(otrasObligaciones.dniRepresentanteEors),
                cargo_representante_eors: safe(otrasObligaciones.cargoRepresentanteEors),
                nombre_responsable_generador: safe(otrasObligaciones.generadorResponsableManejo),
                firma_responsable_generador: safe(otrasObligaciones.firmaGeneradorResponsableManejo),
                dni_responsable_generador: safe(otrasObligaciones.dniGeneradorResponsableManejo),
                cargo_responsable_generador: safe(otrasObligaciones.cargoGeneradorResponsableManejo),
                fecha_devolucion: fechaFormat(otrasObligaciones.fecha),
                hora_devolucion: safe(otrasObligaciones.hora),

                missingKey: "N/A"
            };
        }
        const docxWord = await convertDocx(dataDocx, templatePath)
        const convert = await convertToPdf(docxWord);

        if (!convert) {
            console.error("La conversión a PDF no generó un resultado válido");
            return res.status(500).json({ message: "Error al convertir el documento a PDF", type: "Error" });
        }
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename=reporte.pdf',
        });
        res.send(convert);

    } catch (error) {
        console.error("Error generando PDF:", error);
        res.status(500).json({ message: "Error al generar el PDF", type: "Error" });
    }
};

module.exports = generarPDFManifiesto;