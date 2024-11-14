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
/*Creación del socket */
const io = new SocketServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['*'],
        credentials: true
    }
});

/*Función para generar la letra de en base a la posición del usuario */
function asignarLetra(posicion) {
    const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const indiceLetra = (posicion - 1) % alfabeto.length; // Calcula el índice en el alfabeto
    return alfabeto[indiceLetra];
}

/*Lógica de la primera fase, es decir, de verificar si un usuario esta registrado en el sistema o no
Primero buscamos al usuario mediante su cedula de identidad (ci) y su id
Si lo encontramos, se devuele su data con su nombre y apellido, si no, simplemente lo devolvemos vacío.
Y también devolvemos si el user se encuentra o no en el sistema registrado con la variable
isUser*/
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

/*Lógica de la segunda fase, es decir, de la fase encargada de validar que un usuario este en una cola
Si mediante el id y la selección de la visita se encuentra en el sistema, devolvemos su información(Su número de cola
y su letra asociada).

En caso de que no se encuentre en la cola, se busca a la persona en la última posición,
se aumente en uno, se consigue la posicicón de la letra asociada a ese usuario y luego
se inserta en la base de datos, y con los datos generados, los retornamos al cliente*/
async function handleFase2(parsedData) {
    let response = {}
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
        let ultimaPosicion =  0;
        if(row.max!=null) ultimaPosicion = row.max
        ultimaPosicion = ultimaPosicion+1;
        const letra = asignarLetra(ultimaPosicion);
        console.log(ci)
        console.log(selectedReason)
        console.log(letra)
        console.log(ultimaPosicion)
    
        

        await pool.query('INSERT INTO cola (cedula, tipo_cola, posicion, letra) VALUES ($1, $2, $3, $4) RETURNING *', [ci, selectedReason, ultimaPosicion, letra]);
        response = {
            responseFase: 2,
            id: ultimaPosicion,
            posicion: ultimaPosicion,
            letra: letra,
        };
    }

    return response
}


/*Manejo del socket utilizado para la conexión*/
io.on('connection', async (socket) => {
    console.log('socket connected')
    /*Manejo del socket message*/
    /*Obtenemos la información pasada por el cliente que es principalemnte la fase(fase 1 o fase2), ci(cedula de identidad)
    ,selectedReason(selección de la visista).
    
    En base a en que fase se recibe la petición se procesan las funciones ya explicadas anteriormente
    handleFase1 y handleFase2.
    
    Y en base a la logica realizada, se envía la respuesta al cliente.*/
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