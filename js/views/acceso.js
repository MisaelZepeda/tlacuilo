// Acceso: la misma cuenta de Morralla (Firebase Auth del mismo proyecto).

import { auth } from '../firebase-init.js';
import { on } from '../core/eventos.js';
import { icon } from '../lib/icons.js';
import { toast } from '../components/capas.js';
import { tecoSVG } from '../components/teco.js';

const raiz = () => document.getElementById('acceso');
let modo = 'login';

const ERRORES = {
    'auth/user-not-found': 'Ese correo no está registrado.',
    'auth/wrong-password': 'La contraseña es incorrecta.',
    'auth/invalid-credential': 'El correo o la contraseña son incorrectos.',
    'auth/invalid-login-credentials': 'El correo o la contraseña son incorrectos.',
    'auth/invalid-email': 'El correo no tiene un formato válido.',
    'auth/network-request-failed': 'Sin conexión a internet.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
};
const error = (e) => ERRORES[e.code] || 'Ocurrió un error. Intenta de nuevo.';

function formHTML() {
    if (modo === 'reset') return `<form data-submit="accReset">
        <h2>Recuperar acceso</h2><p class="acc-lede">Te enviaremos un correo para restablecer tu contraseña.</p>
        <div class="field"><label for="ac-email">Correo</label><input id="ac-email" name="email" type="email" autocomplete="email" required></div>
        <button class="btn btn-primary btn-block btn-lg" type="submit">Enviar enlace</button>
        <p class="acc-pie"><button type="button" class="link" data-action="accModo" data-m="login">Volver</button></p>
    </form>`;
    return `<form data-submit="accLogin">
        <div class="acc-teco">${tecoSVG('contento', { tamano: 96 })}</div>
        <h2>Hola de nuevo</h2><p class="acc-lede">Entra con tu cuenta de Morralla.</p>
        <div class="field"><label for="ac-email">Correo</label><input id="ac-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="ac-pass">Contraseña</label><input id="ac-pass" name="pass" type="password" autocomplete="current-password" required></div>
        <p style="text-align:right; margin:-4px 0 16px;"><button type="button" class="link" data-action="accModo" data-m="reset">¿Olvidaste tu contraseña?</button></p>
        <button class="btn btn-primary btn-block btn-lg" type="submit">Entrar</button>
        <button class="btn btn-soft btn-block" type="button" data-action="entrarDemo" style="margin-top:10px;">${icon('eye')}Explorar la demo</button>
    </form>`;
}

export function mostrarAcceso() {
    const el = raiz();
    el.hidden = false;
    el.innerHTML = `<div class="acceso">
        <div class="acc-panel">
            <div class="brand"><img src="logo.svg" alt="">tlacuilo</div>
            <div class="acc-form">${formHTML()}</div>
        </div>
        <aside class="acc-lado">
            ${tecoSVG('contento', { tamano: 120 })}
            <p class="acc-eyebrow">El que escribe y recuerda</p>
            <h1>Tu agenda, tus pendientes y tus notas, junto a tu dinero.</h1>
            <ul>
                <li>${icon('check-circle')}Pendientes con fecha, hora, listas y subtareas</li>
                <li>${icon('calendar')}Lo que vence en Morralla, en tu día</li>
                <li>${icon('sparkle')}Teco te recuerda y te aconseja</li>
            </ul>
        </aside>
    </div>`;
}

export function ocultarAcceso() { const el = raiz(); el.hidden = true; el.innerHTML = ''; }

on('accModo', (el) => { modo = el.dataset.m; mostrarAcceso(); });
on('accLogin', (f) => {
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => auth.signInWithEmailAndPassword(f.elements.email.value, f.elements.pass.value))
        .catch(e => toast(error(e), { tipo: 'error' }));
}, 'submit');
on('accReset', (f) => {
    auth.sendPasswordResetEmail(f.elements.email.value)
        .then(() => { toast('Te enviamos un correo'); modo = 'login'; mostrarAcceso(); })
        .catch(e => toast(error(e), { tipo: 'error' }));
}, 'submit');
