import { io } from 'socket.io-client';

// eslint-disable-next-line no-undef
const URL = 'https://place-backend.onrender.com'; // local: http://127.0.0.1:5000 web: http://wenzelz.pythonanywhere.com/

export const socket = io(URL, {
    cors: {
        origin:"http://localhost:3000"
    }
 });