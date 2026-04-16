require("dotenv").config();
const { PORT } = process.env;
const { httpServer } = require("./src/app");
const connectDB = require("./src/dbConnection");

connectDB();

httpServer.listen(PORT || 3001, () => {
  console.log(`Servidor corriendo en el puerto ${PORT || 3001}`);
});