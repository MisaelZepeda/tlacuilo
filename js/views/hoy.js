// Hoy: saludo, Teco, captura rápida, agenda con hora, pendientes del día y
// atrasados, lo que vence en Morralla y un vistazo a los próximos días.

import { sel } from '../core/store.js';
import { on } from '../core/eventos.js';
import { guardarTarea } from '../core/actions.js';
import { icon } from '../lib/icons.js';
import { escapeHtml, money } from '../lib/format.js';
import { toast } from '../components/capas.js';
import { tecoSVG } from '../components/teco.js';
import { tareaHTML, vacioTecoHTML } from '../components/piezas.js';
import { abrirTarea } from '../components/tarea-form.js';
import { clasificar } from '../domain/tareas.js';
import { estadoTeco, consejoAlAzar } from '../domain/teco.js';
import { pendientesDeDinero, gastoDelDia } from '../domain/finanzas.js';
import { hoyISO, sumarDias } from '../domain/fechas.js';

export const MORRALLA_URL = 'https://misaelzepeda.github.io/financiapp/';

let consejo = consejoAlAzar();

export const titulo = () => ({ titulo: 'Hoy' });

function saludo() {
    const h = new Date().getHours();
    const nombre = (sel.perfil().nombre || '').trim().split(' ')[0];
    const base = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    return nombre ? `${base}, ${escapeHtml(nombre)}` : base;
}

function fechaLargaHoy() {
    const t = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
}

function tecoHTML() {
    const t = estadoTeco(sel.tareas());
    return `<button class="teco-card" data-action="tecoConsejo">
        ${tecoSVG(t.estado, { tamano: 74 })}
        <span class="teco-card-texto"><span class="teco-card-msg">${escapeHtml(t.mensaje)}</span>
            <span class="teco-card-consejo"><b>Consejo:</b> ${escapeHtml(consejo)}</span></span></button>`;
}

function agendaHTML(conHora) {
    if (!conHora.length) return '';
    const ahora = new Date().toTimeString().slice(0, 5);
    return `<div class="seccion-head"><h2>Agenda</h2></div>
        <section class="card"><div class="agenda">${conHora.map(t => `<div class="agenda-item ${t.hora < ahora ? 'pasada' : ''}">
            <div class="agenda-hora">${escapeHtml(t.hora)}</div>${tareaHTML(t, { mostrarFecha: false, mostrarHora: false })}</div>`).join('')}</div></section>`;
}

function dineroHTML() {
    const v4 = sel.v4();
    const items = pendientesDeDinero(v4, new Date(), 1);
    const h = hoyISO();
    const gasto = gastoDelDia(v4, h);
    if (!items.length && !gasto) return '';
    const ICONO = { pago: 'credit-card', recurrente: 'repeat', ingreso: 'coin', cobro: 'share' };
    const yaEsPendiente = (clave) => sel.tareas().some(t => t.origen?.morralla === clave);
    return `<div class="seccion-head"><h2>Dinero</h2><a class="link" href="${MORRALLA_URL}" target="_blank" rel="noopener">Abrir Morralla ${icon('external')}</a></div>
        <section class="card"><div class="dinero">
            ${items.map(e => `<div class="dinero-fila">
                <div class="fila-ico">${icon(ICONO[e.tipo] || 'coin')}</div>
                <div class="fila-body"><div class="fila-titulo">${escapeHtml(e.titulo)}</div>
                    <div class="fila-sub">${e.vencido ? '<span class="vencido">Vencido</span>' : e.fecha === h ? 'Hoy' : 'Mañana'} · <span class="privado">${money(e.monto)}</span></div></div>
                ${yaEsPendiente(e.clave) ? `<span class="badge">${icon('check')}En pendientes</span>`
                    : `<button class="btn btn-soft btn-sm" data-action="dineroAPendiente" data-clave="${escapeHtml(e.clave)}">${icon('plus')}Pendiente</button>`}
            </div>`).join('')}
            ${items.length ? '' : '<p class="hint" style="margin:0;">Nada vence hoy ni mañana.</p>'}
            <div class="dinero-pie"><span>Gastado hoy</span><b class="privado">${money(gasto)}</b></div>
        </div></section>`;
}

function proximosHTML(g) {
    const dias = [1, 2, 3].map(i => sumarDias(hoyISO(), i));
    const conteo = dias.map((d, i) => [d, sel.tareas().filter(t => !t.hecha && t.fecha === d).length, i]).filter(([, n]) => n);
    if (!conteo.length) return '';
    const nombre = (d, i) => i === 0 ? 'Mañana' : new Date(`${d}T12:00`).toLocaleDateString('es-MX', { weekday: 'long' });
    return `<div class="seccion-head"><h2>Próximos días</h2><a class="link" href="#/pendientes?vista=proximos">Ver todo</a></div>
        <section class="card"><div class="lista">${conteo.map(([d, n, i]) => `<a class="fila fila-link" href="#/pendientes?vista=proximos">
            <div class="fila-ico">${icon('calendar')}</div><div class="fila-body"><div class="fila-titulo">${escapeHtml(nombre(d, i).charAt(0).toUpperCase() + nombre(d, i).slice(1))}</div></div>
            <div class="fila-der"><span class="num">${n}</span><small>${n === 1 ? 'pendiente' : 'pendientes'}</small></div></a>`).join('')}</div></section>`;
}

export function render() {
    const g = clasificar(sel.tareas());
    const conHora = g.hoy.filter(t => t.hora);
    const sinHora = g.hoy.filter(t => !t.hora);
    const hechasHoy = g.hechas.filter(t => t.hechaEn && hoyISO(new Date(t.hechaEn)) === hoyISO());
    const nadaHoy = !g.hoy.length && !g.atrasadas.length;
    return `<div class="hoy-cabeza"><div class="hoy-saludo">${saludo()}</div><div class="hoy-fecha">${fechaLargaHoy()}</div></div>
        <form class="rapido" data-submit="rapido"><input name="titulo" placeholder="Agregar pendiente para hoy…" autocomplete="off" aria-label="Nuevo pendiente para hoy">
            <button class="btn btn-primary" type="submit" aria-label="Agregar">${icon('plus')}</button></form>
        ${tecoHTML()}
        ${agendaHTML(conHora)}
        ${g.atrasadas.length ? `<div class="seccion-head"><h2 class="neg">Atrasados</h2><span class="card-meta">${g.atrasadas.length}</span></div>
            <section class="card card-flush"><div class="lista-tareas">${g.atrasadas.map(t => tareaHTML(t)).join('')}</div></section>` : ''}
        <div class="seccion-head"><h2>Pendientes de hoy</h2>${hechasHoy.length ? `<span class="card-meta">${hechasHoy.length} hecho${hechasHoy.length === 1 ? '' : 's'}</span>` : ''}</div>
        <section class="card ${sinHora.length || hechasHoy.length ? 'card-flush' : ''}">${sinHora.length || hechasHoy.length
            ? `<div class="lista-tareas">${sinHora.map(t => tareaHTML(t, { mostrarFecha: false })).join('')}${hechasHoy.map(t => tareaHTML(t, { mostrarFecha: false })).join('')}</div>`
            : vacioTecoHTML(nadaHoy ? 'Día libre' : 'Todo con hora', nadaHoy ? 'No tienes pendientes para hoy. Escribe arriba lo que quieras hacer.' : 'Tus pendientes de hoy están en la agenda.')}</section>
        ${dineroHTML()}
        ${proximosHTML(g)}`;
}

on('rapido', async (form) => {
    const titulo = form.elements.titulo.value.trim();
    if (!titulo) return;
    form.elements.titulo.value = '';
    await guardarTarea({ titulo, fecha: hoyISO(), prioridad: 0, hecha: false });
    toast('Agregado para hoy');
    document.querySelector('.rapido input')?.focus();
}, 'submit');

on('tecoConsejo', () => { consejo = consejoAlAzar(consejo); const el = document.querySelector('.teco-card-consejo'); if (el) el.innerHTML = `<b>Consejo:</b> ${escapeHtml(consejo)}`; });

// Un pago o cobro de Morralla se vuelve pendiente (una sola vez, por su clave).
on('dineroAPendiente', async (el) => {
    const e = pendientesDeDinero(sel.v4(), new Date(), 1).find(x => x.clave === el.dataset.clave);
    if (!e) return;
    await guardarTarea({ titulo: `${e.titulo} ${money(e.monto)}`, fecha: e.fecha < hoyISO() ? hoyISO() : e.fecha, prioridad: e.tipo === 'pago' ? 3 : 2, hecha: false, origen: { morralla: e.clave } });
    toast('Agregado a pendientes');
});

on('nuevoPendiente', () => abrirTarea());
on('editarTarea', (el) => abrirTarea({ id: el.dataset.id }));
