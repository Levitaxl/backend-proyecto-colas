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


io.on('connection', async (socket) => {
    console.log('Client Connected');
  
    socket.on('message', async (data) => {
      try {
        const parsedData = JSON.parse(data);
        console.log(parsedData);
  
        const { fase, ci, id, selectedReason } = parsedData;
  
        let response;
  
        if (fase === 1) {
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
          // Assume petition exists for now (adjust logic as needed)
          const peticionExist = true;
  
          response = {
            peticionExist,
            responseFase: 2,
            id: 123, // Replace with actual ID retrieval logic
            letra: 'h', // Replace with actual letter retrieval logic
          };
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