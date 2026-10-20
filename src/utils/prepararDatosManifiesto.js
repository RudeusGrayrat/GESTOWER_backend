// El módulo de imágenes necesita un valor no vacío incluso antes de que se firme.
const FIRMA_VACIA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLkNwAAAABJRU5ErkJggg==";
const FIRMAS = ["firma_generador", "firma_transportista", "firma_destino", "firma_representante_eors", "firma_responsable_generador"];

const prepararDatosManifiesto = (datos) => {
    const preparado = { ...datos };
    for (const clave of FIRMAS) preparado[clave] = preparado[clave] || FIRMA_VACIA;
    // La plantilla recibida utiliza estos nombres; se conserva compatibilidad
    // con los nombres anteriores y con la plantilla de documentos pendientes.
    preparado.firma_destinoXXXX = preparado.firma_destino;
    // En otra revisión de la plantilla las X quedaron insertadas dentro de la palabra.
    preparado.firma_destinXXXXo = preparado.firma_destino;
    preparado.fecha_aprobacion = datos.fecha_aprobacion_iga;
    preparado.check_otros_peligros = datos.otros_otros_peligros;
    preparado.check_comercializacion = datos.otros_comercializacion;
    preparado.check_exportacion = datos.otros_exportacion;
    preparado.check_otro = datos.otros_otro;
    return preparado;
};

module.exports = { prepararDatosManifiesto, FIRMA_VACIA };
