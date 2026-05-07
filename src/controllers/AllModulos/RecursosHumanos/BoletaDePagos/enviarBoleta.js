const {
  URL_BACKEND,
  EMAIL_LADIAMB,
  PASS_LADIAMB,
  SMTP_LADIAMB,
  EMAIL_CORPEMSE,
  PASS_CORPEMSE,
  SMTP_CORPEMSE,
  EMAIL_TOWERANDTOWER,
  PASS_TOWERANDTOWER,
  SMTP_TOWERANDTOWER,
  EMAIL_ECOLOGY,
  PASS_ECOLOGY,
  SMTP_ECOLOGY,
  EMAIL_INVERSIONESLURIN,
  PASS_INVERSIONESLURIN,
  SMTP_INVERSIONESLURIN,
} = process.env;
const nodemailer = require("nodemailer");
const BoletaDePagos = require("../../../../models/RecursosHumanos/BoletaDePago");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const convertDocx = require("../../../../utils/convertDocx");
const path = require("path");
const convertToPdf = require("../../../../utils/convertToPdf");

dayjs.extend(utc);
dayjs.extend(timezone);

const enviarBoleta = async (req, res) => {
  const { datosBoleta, business } = req.body;
  console.log("Datos recibidos para enviar boletas:", { datosBoleta, business });
  try {
    if (!datosBoleta || datosBoleta.length === 0) {
      return res.status(400).json({ message: "Faltan datos para procesar.", type: "Error" });
    }

    const datosBoletaDePago = await Promise.all(datosBoleta);

    // Responder inmediatamente al cliente
    res.status(200).json({
      message: "El proceso de envío de correos ha comenzado.", type: "Correcto"
    });
    const rootPath = process.cwd();
    let NOMBRE_PLANTILLA = "BOLETA_TOWER_DOCX.docx";
    let EMAIL_USER;
    let EMAIL_PASS;
    let SMTP;
    let PORT = 465;
    // Configurar transporte de nodemailer
    if (business?.includes("LABORADORIO") || business?.includes("LADIAMB")) {
      EMAIL_USER = EMAIL_LADIAMB;
      EMAIL_PASS = PASS_LADIAMB;
      SMTP = SMTP_LADIAMB;
      NOMBRE_PLANTILLA = "BOLETA_LADIAMB_DOCX.docx";
    } else if (business?.includes("CORPEMSE")) {
      EMAIL_USER = EMAIL_CORPEMSE;
      EMAIL_PASS = PASS_CORPEMSE;
      SMTP = SMTP_CORPEMSE;
      NOMBRE_PLANTILLA = "BOLETA_CORPEMSE_DOCX.docx";
    } else if (business?.includes("TOWER AND TOWER")) {
      EMAIL_USER = EMAIL_TOWERANDTOWER;
      EMAIL_PASS = PASS_TOWERANDTOWER;
      SMTP = SMTP_TOWERANDTOWER;
      PORT = 587;
      NOMBRE_PLANTILLA = "BOLETA_TOWER_DOCX.docx";
    } else if (business?.includes("ECOLOGY")) {
      EMAIL_USER = EMAIL_ECOLOGY;
      EMAIL_PASS = PASS_ECOLOGY;
      SMTP = SMTP_ECOLOGY;
      NOMBRE_PLANTILLA = "BOLETA_ECOLOGY_DOCX.docx";
    } else if (business?.includes("INVERSIONES LURIN")) {
      EMAIL_USER = EMAIL_INVERSIONESLURIN;
      EMAIL_PASS = PASS_INVERSIONESLURIN;
      SMTP = SMTP_INVERSIONESLURIN;
      NOMBRE_PLANTILLA = "BOLETA_INVERSIONES_LURIN_DOCX.docx";
    } else {
      EMAIL_USER = EMAIL_TOWERANDTOWER;
      EMAIL_PASS = PASS_TOWERANDTOWER;
      SMTP = SMTP_TOWERANDTOWER;
      PORT = 587;
      NOMBRE_PLANTILLA = "BOLETA_TOWER_DOCX.docx";
    }
    const templatePath = path.join(rootPath, "templates", NOMBRE_PLANTILLA);
    console.log("EMPRESA:", business);
    console.log("NOMBRE PLANTILLA:", NOMBRE_PLANTILLA);
    const transporter = nodemailer.createTransport({
      host: SMTP,
      port: PORT,
      secure: PORT === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
      connectionTimeout: 5000, // 5 segundos
      sendTimeout: 10000, // 10 segundos
      ...(business?.includes("TOWER AND TOWER") && {
        tls: { rejectUnauthorized: false },
      }),
    });
    const errores = [];
    const { default: PQueue } = await import("p-queue");
    const queue = new PQueue({ concurrency: 3 }); // Instanciar PQueue con 'new'
    // Iterar sobre cada boleta y agregar la tarea a la cola
    for (const {
      dataDocx,
      email,
      colaborador,
      empresa,
      fechaBoletaDePago,
      boletaId,
    } of datosBoletaDePago) {
      queue.add(async () => {
        try {
          if (
            !dataDocx ||
            !email ||
            !colaborador ||
            !empresa ||
            !fechaBoletaDePago ||
            !boletaId
          ) {
            errores.push({ email, error: "Faltan datos." });
            return;
          }

          const findBoleta = await BoletaDePagos.findById(boletaId);
          if (!findBoleta) {
            throw new Error("Boleta no encontrada");
          }
          const wordBuffer = await convertDocx(dataDocx, templatePath);
          if (!wordBuffer) {
            throw new Error("Error al generar el documento Word");
          }
          const pdfBuffer = await convertToPdf(wordBuffer);
          if (!pdfBuffer) {
            throw new Error("Error al convertir a PDF");
          }

          const mailOptions = {
            from: `Boleta de Pago <${EMAIL_USER}>`,
            to: email,
            subject: "Boleta de Pago",
            text: "Boleta de Pago",
            attachments: [
              {
                filename: "Boleta de Pago.pdf",
                content: pdfBuffer,
                encoding: "base64",
              },
            ],
            html: `        <!DOCTYPE html>
            <html lang="es">
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Boleta de Pago</title>
            <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 20px;
                }
                .container {
                  background-color: #ffffff;
                  border-radius: 5px;
                  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                  padding: 20px;
                  max-width: 600px;
                  margin: auto;
                }
                h1 {
                  color: #4CAF50; /* Verde */
                }
                p {
                  color: #555;
                  line-height: 1.5;
                }
                .button {
                  display: inline-block;
                  background-color: #FFC107; /* Amarillo */
                  color: #ffffff;
                  padding: 10px 15px;
                  text-decoration: none;
                  border-radius: 5px;
                  margin-top: 20px;
                }
                .footer {
                    margin-top: 20px;
                    font-size: 12px;
                    color: #777;
                  }
                  </style>
              </head>
              <body>
                  <div class="container">
                <h1>Estimado/a ${colaborador},</h1>
                <p>Le informamos que su boleta de pago correspondiente al mes de ${fechaBoletaDePago} ha sido generada.</p>
                <p>Si tiene alguna pregunta o necesita más información, no dude en ponerse en contacto con el departamento de recursos humanos.</p>
                <p>Saludos cordiales,</p>
                <p>${empresa}</p>
                <div class="footer">
                <p>Este es un correo automático, por favor no responda.</p>
                <img src="${URL_BACKEND}/recepcionBoleta?boletaId=${boletaId}" style="display:none;" alt="pixel de seguimiento" />
      
                </div>
                </div>
                </body>
            </html>
      
                  `,
          };

          await transporter.sendMail(mailOptions);
          // findBoleta.envio = dayjs()
          //   .tz("America/Lima")
          //   .format("DD/MM/YYYY hh:mm A");
          await findBoleta.save();
        } catch (error) {
          errores.push({ email, error: error.message });
        }
      });
    }

    await queue.onIdle();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = enviarBoleta;
