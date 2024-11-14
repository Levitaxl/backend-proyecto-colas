import express from 'express'
import {
    Server as SocketServer
} from 'socket.io'
import http from 'http'
import {
    pool
} from './connection.js'

import {config} from 'dotenv'
config();


const app = express();
const server = http.createServer(http);
const io = new SocketServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['*'],
        credentials: true
    }
});

function asignarLetra(posicion) {
    const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const indiceLetra = (posicion - 1) % alfabeto.length; // Calcula el índice en el alfabeto
    return alfabeto[indiceLetra];
}

async function handleFase1(data) {
    const {ci,id} = data;
    const users = await pool.query('SELECT * FROM usuarios WHERE cedula = $1 AND id = $2', [ci, id]);
    const isUser = users.rows.length > 0;

    return {
        isUser,
        responseFase: 1,
        nombre: isUser ? users.rows[0].nombre : undefined,
        apellido: isUser ? users.rows[0].apellido : undefined,
    };
}

async function handleFase2(parsedData) {
    const {ci,selectedReason} = parsedData;

    const peticion = await pool.query('SELECT * FROM cola WHERE cedula = $1 AND tipo_cola = $2', [ci, selectedReason]);

    if (peticion.rows.length > 0) {
        const {posicion, letra} = peticion.rows[0];
        response = {
            responseFase: 2,
            posicion,
            letra,
        };
    } 
    
    else {
        const {rows: [row]} = await pool.query('SELECT MAX(posicion) AS max FROM cola WHERE tipo_cola = $1', [selectedReason]);
        const ultimaPosicion = row?.max || 1;
        const letra = asignarLetra(ultimaPosicion);

        await pool.query('INSERT INTO cola (cedula, tipo_cola, posicion, letra) VALUES ($1, $2, $3, $4) RETURNING *', [ci, selectedReason, ultimaPosicion, letra]);
        response = {
            responseFase: 2,
            id: ultimaPosicion,
            posicion: ultimaPosicion,
            letra,
        };
    }
}

io.on('connection', async (socket) => {
    console.log('socket connected')
    socket.on('message', async (data) => {
        try {
            console.log('message socket')

            const parsedData = JSON.parse(data);
            const {fase} = parsedData;

            let response;

            if (fase === 1)    {
                console.log('fase1')
                response = await handleFase1(parsedData);
            }   
             else if (fase === 2){
                console.log('fase2')
                response = await handleFase2(parsedData);
             } 
            
            const jsonString = JSON.stringify(response);
            socket.broadcast.emit('message', jsonString);

        } 
        catch (error) {
            console.error('Error processing message:', error);
            socket.emit('error', {
                message: 'An error occurred while processing your request.'
            });
        }
    });
});


server.listen(process.env.PORT || 3000)
console.log('Server on port', process.env.PORT || 3000)