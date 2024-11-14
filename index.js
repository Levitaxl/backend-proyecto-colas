import  express from 'express'
import {Server as SocketServer} from 'socket.io'
import http from 'http'
import {pool} from './connection.js'

const app = express();
const server = http.createServer(http);
const io = new SocketServer(server, {
    cors: {
        origin: '*', // Permite solicitudes desde cualquier origen
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Incluye todos los métodos HTTP comunes
        allowedHeaders: ['*'], // Permite todos los encabezados
        credentials: true // Permite el envío de cookies
    }
});

function asignarLetra(posicion) {
    const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const indiceLetra = (posicion - 1) % alfabeto.length; // Calcula el índice en el alfabeto
    return alfabeto[indiceLetra];
  }

io.on('connection', async (socket) => {
    console.log('Client Connected');
    return;
  
    socket.on('message', async (data) => {
      try {
        const parsedData = JSON.parse(data);
  
        const { fase } = parsedData;
  
        let response;
  
        if (fase === 1) {
            const {ci, id } = parsedData;
          // Check for user existence in database
          const users = await pool.query('SELECT * FROM usuarios WHERE cedula = $1 AND id = $2', [ci, id]);
          const isUser = users.rows.length > 0;
  
          response = {
            isUser,
            responseFase: 1,
            nombre: isUser ? users.rows[0].nombre : undefined,
            apellido: isUser ? users.rows[0].apellido : undefined,
          };
        } else if (fase === 2) {
            const {ci, selectedReason } = parsedData;

            const peticion = await pool.query('SELECT * FROM cola WHERE cedula = $1 AND tipo_cola = $2', [ci, selectedReason]);
            
            if (peticion.rows.length > 0) {
                const { posicion, letra } = peticion.rows[0];
                response = {
                    responseFase: 2,
                    posicion: posicion,
                    letra: letra,
                };
            }
            else{
                console.log("Exito")
                let  rows = await pool.query('SELECT MAX(posicion) FROM cola WHERE tipo_cola = $1', [selectedReason]);
                let ultimaPosicion = 1;
                if(rows.rows.length > 0 && rows.rows[0].max!= null ) { ultimaPosicion = rows.rows[0].max+1;}  
                console.log(ultimaPosicion)
                const letra = asignarLetra(ultimaPosicion);
                await pool.query('INSERT INTO cola (cedula, tipo_cola, posicion, letra) VALUES ($1, $2, $3, $4) RETURNING *', [ci, selectedReason, ultimaPosicion, letra]);
                response = {
                    responseFase: 2,
                    id: ultimaPosicion, // O cualquier otro dato relevante
                    posicion: ultimaPosicion,
                    letra,
                };
          
            }

      
        }
        const jsonString = JSON.stringify(response);
        socket.broadcast.emit('message', jsonString);
      } catch (error) {
        console.error('Error processing message:', error);
        // Handle errors appropriately, e.g., send error message to client
      }
    });
  });
server.listen(3001)
console.log('Server on port',3001)