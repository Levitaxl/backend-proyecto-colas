import pg from 'pg'
import {config} from 'dotenv'
config();
export const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:true
})

async function crearTablaYDatos() {
    try {
        await pool.connect();

        const { rows: colaRows } = await pool.query('SELECT * FROM information_schema.tables WHERE table_name = $1', ['cola']);
        const tablaColaExiste = colaRows.length > 0;

        const { rows: usuariosRows } = await pool.query('SELECT * FROM information_schema.tables WHERE table_name = $1', ['usuarios']);
        const tablaUsuariosExiste = usuariosRows.length > 0;

        if (!tablaColaExiste) {
            await pool.query(`
                CREATE TABLE cola (
                    id SERIAL PRIMARY KEY,
                    posicion INTEGER NOT NULL,
                    cedula TEXT NOT NULL,
                    tipo_cola TEXT NOT NULL,
                    letra TEXT NOT NULL
                )
            `);
        }

        if (!tablaUsuariosExiste) {
            await pool.query(`
                CREATE TABLE usuarios (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(100),
                    apellido VARCHAR(100),
                    cedula VARCHAR(20)
                )
            `);

            await pool.query(`
                INSERT INTO usuarios (nombre, apellido, cedula)
                VALUES
                    ('Hermes', 'Sanchez', '11111111'),
                    ('Oriana', 'Zambrano', '22222222'),
                    ('Carlos', 'Matias', '33333333'),
                    ('Maria', 'Perez', '44444444'),
                    ('Daniel', 'Avila', '55555555')
            `);
        }

        console.log('Tablas y datos creados correctamente (si no existían)');
    } catch (error) {
        console.error('Error al crear tablas o insertar datos:', error);
    } finally {
        await pool.end();
    }
}

//crearTablaYDatos();