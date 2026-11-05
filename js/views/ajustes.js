// Ajustes: tus listas, apariencia (compartida con Morralla), enlace a Morralla y sesión.

import { store, sel } from '../core/store.js';
import { on } from '../core/eventos.js';
import { guardarLista, borrarLista } from '../core/actions.js';
import { icon } from '../lib/icons.js';
import { escapeHtml } from '../lib/format.js';
import { confirmar, toast } from '../components/capas.js';
import { COLORES_LISTA } from '../components/piezas.js';
import { temaElegido, elegirTema } from '../lib/apariencia.js';
import { MORRALLA_URL } from './hoy.js';

export const titulo = () => ({ titulo: 'Ajustes' });

export function selectorTema(tema) {
    return `<div class="seg seg-tema">${[['auto', 'sparkle', 'Automático'], ['claro', 'sun', 'Claro'], ['oscuro', 'moon', 'Oscuro']]
        .map(([v, i, t]) => `<button class="${tema === v ? 'activo' : ''}" data-action="ajTema" data-v="${v}">${icon(i)} ${t}</button>`).join('')}</div>`;
}

export function render() {
    const p = sel.perfil();
    const listas = sel.listas();
    const cuenta = (id) => sel.tareas().filter(t => t.listaId === id && !t.hecha).length;
    return `<div class="ajustes">
        <section class="card">
            <h2 class="card-title" style="margin-bottom:6px;">Listas</h2>
            <p class="card-desc" style="margin:0 0 10px;">Agrupa tus pendientes por contexto: Casa, Trabajo, Compras…</p>
            <div>${listas.map(l => `<div class="lista-fila">
                <input value="${escapeHtml(l.nombre)}" data-change="ajListaNombre" data-id="${escapeHtml(l.id)}" aria-label="Nombre de la lista">
                <div class="colores">${COLORES_LISTA.slice(0, 5).map(c => `<button class="color ${(l.color || COLORES_LISTA[0]) === c ? 'activo' : ''}" style="--c:${c}" data-action="ajListaColor" data-id="${escapeHtml(l.id)}" data-c="${c}" aria-label="Color"></button>`).join('')}</div>
                <button class="icon-btn" data-action="ajListaBorrar" data-id="${escapeHtml(l.id)}" aria-label="Borrar lista ${escapeHtml(l.nombre)}" title="${cuenta(l.id)} pendientes">${icon('trash')}</button>
            </div>`).join('')}</div>
            <form data-submit="ajListaNueva" style="display:flex; gap:8px; margin-top:10px;"><input name="nombre" placeholder="Nueva lista" autocomplete="off" aria-label="Nueva lista"><button class="btn btn-soft" type="submit">${icon('plus')}Agregar</button></form>
        </section>

        <section class="card">
            <h2 class="card-title" style="margin-bottom:14px;">Apariencia</h2>
            <div class="field" style="margin:0;"><span class="label">Tema</span>${selectorTema(temaElegido())}
                <span class="hint">Se comparte con Morralla en este dispositivo.</span></div>
        </section>

        <section class="card">
            <a class="morralla-link" href="${MORRALLA_URL}" target="_blank" rel="noopener">
                <img src="${MORRALLA_URL}logo.svg" alt="">
                <div><b>Morralla</b><small>Tus finanzas. Tlacuilo lee tus pagos y gastos para mostrarlos en Hoy.</small></div>${icon('external')}</a>
        </section>

        <section class="card">
            <h2 class="card-title" style="margin-bottom:6px;">Tu cuenta</h2>
            <p class="hint" style="margin:0 0 12px;">${escapeHtml(p.nombre || '')}${store.usuario?.email ? ` · ${escapeHtml(store.usuario.email)}` : ''}${store.demo ? 'Modo demo' : ''}. Es la misma cuenta de Morralla.</p>
            <button class="btn btn-ghost btn-block" data-action="cerrarSesion">${icon('log-out')}${store.demo ? 'Salir de la demo' : 'Cerrar sesión'}</button>
        </section>
        <p class="hint" style="text-align:center;">Tlacuilo · el que escribe y recuerda</p>
    </div>`;
}

on('ajTema', (el) => elegirTema(el.dataset.v));
on('ajListaNombre', (el) => { const n = el.value.trim(); if (n) guardarLista({ id: el.dataset.id, nombre: n.slice(0, 40) }); }, 'change');
on('ajListaColor', (el) => guardarLista({ id: el.dataset.id, color: el.dataset.c }));
on('ajListaNueva', async (form) => {
    const nombre = form.elements.nombre.value.trim();
    if (!nombre) return;
    await guardarLista({ nombre: nombre.slice(0, 40), color: COLORES_LISTA[sel.listas().length % COLORES_LISTA.length] });
    toast('Lista agregada');
}, 'submit');
on('ajListaBorrar', async (el) => {
    const l = sel.lista(el.dataset.id);
    if (!l) return;
    if (!(await confirmar({ titulo: `Borrar "${l.nombre}"`, texto: 'Sus pendientes se conservan, sin lista.', aceptar: 'Borrar', peligro: true }))) return;
    await borrarLista(l.id);
    toast('Lista borrada');
});
