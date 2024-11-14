import  express from 'express'
import {Server as SocketServer} from 'socket.io'
import http from 'http'

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


io.on('connection', socket =>{
    console.log('Clien Connected')
    socket.on('message',(data =>{

        data = JSON.parse(data);
        console.log(data)
        const fase = data.fase;
        if(fase==1){
            const ci = data.ci;
            const id = data.id;
            let  response = {
                'isUser' : false,
                'responseFase': 1
            }

            if(ci == '123' && id == '1'){
                response = {
                    'isUser' : true,
                    'responseFase': 1,
                    'nombre' : "Hermes",
                    'apellido' : "Sanchez"
                }
            }


            const jsonString = JSON.stringify(response);
            socket.broadcast.emit('message', jsonString)
        }

       else  if(fase==2){
            const ci = data.ci;
            const id = data.id;
            const selectedReason = data.selectedReason
            const peticionExist = true;
            console.log(selectedReason)
            //asumismo que existe
            if(peticionExist){
                let  response = {
                    'peticionExist' : peticionExist,
                    'responseFase': 2,
                    'id'            : 123,
                    "letra"         : "h"
                }
                const jsonString = JSON.stringify(response);
                socket.broadcast.emit('message', jsonString)
            }
            else{
            }
        }
    }))
})


server.listen(3001)
console.log('Server on port',3001)