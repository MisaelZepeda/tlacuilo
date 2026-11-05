// Pendientes: vistas Hoy (con atrasados), Próximos, Algún día y Hechos,
// filtro por lista y búsqueda.

import { sel } from '../core/store.js';
import { on } from '../core/eventos.js';
import { icon } from '../lib/icons.js';
import { escapeHtml } from '../lib/format.js';
import { tareaHTML, vacioTecoHTML, COLORES_LISTA } from '../components/piezas.js';
import { abrirTarea } from '../components/tarea-form.js';
import { clasificar } from '../domain/tareas.js';
import { sumarDias, hoyISO } from '../domain/fechas.js';

const VISTAS = { hoy: 'Hoy', proximos: 'Próximos', algun: 'Algún día', hechos: 'Hechos' };
const f = { vista: 'hoy', listaId: '', q: '' };

export const titulo = () => ({ titulo: 'Pendientes' });

export function alEntrar(params) {
    if (params.vista && VISTAS[params.vista]) f.vista = params.vista;
    if (params.lista !== undefined) f.listaId = params.lista;
}

function filtradas() {
    const q = f.q.trim().toLowerCase();
    return sel.tareas().filter(t => (!f.listaId || t.listaId === f.listaId) && (!q || `${t.titulo} ${t.nota || ''}`.toLowerCase().includes(q)));
}

const grupo = (titulo, tareas, clase = '', opts) => tareas.length
    ? `<div class="grupo-titulo ${clase}"><span>${titulo}</span><span>${tareas.length}</span></div><div class="lista-tareas">${tareas.map(t => tareaHTML(t, opts)).join('')}</div>` : '';

function nombreDia(iso) {
    const t = new Date(`${iso}T12:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' }).replace('.', '');
    return t.charAt(0).toUpperCase() + t.slice(1);
}

function listaHTML() {
    const g = clasificar(filtradas());
    let html = '', vacio = null;
    if (f.vista === 'hoy') {
        html = grupo('Atrasados', g.atrasadas, 'atrasadas') + grupo('Hoy', g.hoy, '', { mostrarFecha: false });
        if (!html) vacio = ['Nada pendiente para hoy', 'Agrega algo con el botón + o revisa lo que viene.', 'celebrando'];
    } else if (f.vista === 'proximos') {
        html = grupo('Mañana', g.manana, '', { mostrarFecha: false });
        const porDia = {};
        g.proximas.forEach(t => { (porDia[t.fecha] ||= []).push(t); });
        Object.keys(porDia).sort().forEach(d => { html += grupo(nombreDia(d), porDia[d], '', { mostrarFecha: false }); });
        html += grupo('Más adelante', g.despues);
        if (!html) vacio = ['Semana despejada', 'No hay nada programado para los próximos días.', 'tranquilo'];
    } else if (f.vista === 'algun') {
        html = grupo('Sin fecha', g.sinFecha);
        if (!html) vacio = ['Sin ideas guardadas', 'Lo que no tiene fecha vive aquí. Anota lo que quieras hacer algún día.', 'tranquilo'];
    } else {
        html = grupo('Hechos', g.hechas.slice(0, 100));
        if (!html) vacio = ['Aún nada terminado', 'Lo que marques como hecho aparecerá aquí.', 'tranquilo'];
    }
    return vacio ? `<section class="card">${vacioTecoHTML(...vacio)}</section>` : `<section class="card card-flush">${html}</section>`;
}

export function render() {
    const listas = sel.listas();
    const cuenta = (vista) => {
        const g = clasificar(filtradas());
        return { hoy: g.hoy.length + g.atrasadas.length, proximos: g.manana.length + g.proximas.length + g.despues.length, algun: g.sinFecha.length, hechos: 0 }[vista];
    };
    return `<div class="seg vistas">${Object.entries(VISTAS).map(([k, n]) => {
            const c = cuenta(k);
            return `<button class="${f.vista === k ? 'activo' : ''}" data-action="pVista" data-v="${k}">${n}${c ? ` <span class="muted">${c}</span>` : ''}</button>`;
        }).join('')}</div>
        <div class="chips chips-scroll" style="margin:0 -16px 12px;">
            <button class="chip ${!f.listaId ? 'activo' : ''}" data-action="pLista" data-v="">Todas</button>
            ${listas.map(l => `<button class="chip ${f.listaId === l.id ? 'activo' : ''}" data-action="pLista" data-v="${escapeHtml(l.id)}"><i class="punto" style="--c:${escapeHtml(l.color || COLORES_LISTA[0])}"></i>${escapeHtml(l.nombre)}</button>`).join('')}
            <a class="chip chip-outline" href="#/ajustes">${icon('edit')}Listas</a>
        </div>
        <div class="search" style="margin-bottom:12px;"><span>${icon('search')}</span><input type="search" placeholder="Buscar en pendientes" value="${escapeHtml(f.q)}" data-input="pBuscar" aria-label="Buscar pendientes"></div>
        <div id="p-lista">${listaHTML()}</div>`;
}

const repintar = () => { const v = document.getElementById('vista'); if (v) v.innerHTML = render(); };
on('pVista', (el) => { f.vista = el.dataset.v; repintar(); });
on('pLista', (el) => { f.listaId = el.dataset.v; repintar(); });
on('pBuscar', (el) => { f.q = el.value; const l = document.getElementById('p-lista'); if (l) l.innerHTML = listaHTML(); }, 'input');

// El + crea el pendiente con los valores de la vista actual.
export function nuevoDesdeVista() {
    const fecha = f.vista === 'algun' ? null : f.vista === 'proximos' ? sumarDias(hoyISO(), 1) : hoyISO();
    abrirTarea({ fecha, listaId: f.listaId || null });
}
