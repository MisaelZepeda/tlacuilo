// Calendario: vistas Mes, Semana y Día con capas (eventos, pendientes, pagos de
// Morralla y gasto por día). Al tocar un día se ve todo lo de ese día.

import { sel } from '../core/store.js';
import { on } from '../core/eventos.js';
import { icon } from '../lib/icons.js';
import { escapeHtml, money } from '../lib/format.js';
import { tareaHTML, vacioTecoHTML } from '../components/piezas.js';
import { abrirEvento, abrirNuevo, COLORES_EVENTO } from '../components/evento-form.js';
import { eventosEnRango, dineroEnRango, cuadriculaMes, inicioSemana, nivelesGasto } from '../domain/calendario.js';
import { hoyISO, sumarDias, sumarMeses, ultimoDiaMes } from '../domain/fechas.js';
import { notasDelDia } from '../domain/notas.js';
import { notaCardHTML } from './registros.js';

const VISTAS = { mes: 'Mes', semana: 'Semana', dia: 'Día' };
const CAPAS = { eventos: 'Eventos', pendientes: 'Pendientes', pagos: 'Pagos', gastos: 'Gastos' };
const CLAVE_CAPAS = 'tlacuilo_capas';
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const c = { vista: 'mes', dia: hoyISO(), capas: leerCapas() };

function leerCapas() {
    try { return { eventos: true, pendientes: true, pagos: true, gastos: true, ...JSON.parse(localStorage.getItem(CLAVE_CAPAS)) }; }
    catch { return { eventos: true, pendientes: true, pagos: true, gastos: true }; }
}
function guardarCapas() { try { localStorage.setItem(CLAVE_CAPAS, JSON.stringify(c.capas)); } catch { /* sin almacenamiento */ } }

export const titulo = () => ({ titulo: 'Calendario' });
export function alEntrar(params) { if (params.dia) c.dia = params.dia; if (params.vista && VISTAS[params.vista]) c.vista = params.vista; }

// ---------- Datos del rango ----------
function datos(desde, hasta) {
    const eventos = c.capas.eventos ? eventosEnRango(sel.eventos(), desde, hasta) : [];
    const tareas = c.capas.pendientes ? sel.tareas().filter(t => t.fecha && t.fecha >= desde && t.fecha <= hasta) : [];
    const dinero = (c.capas.pagos || c.capas.gastos) ? dineroEnRango(sel.v4(), desde, hasta) : {};
    const porDia = {};
    const dia = (f) => porDia[f] || (porDia[f] = { eventos: [], tareas: [], pagos: [], gasto: 0, movimientos: [] });
    eventos.forEach(e => dia(e.fecha).eventos.push(e));
    tareas.forEach(t => dia(t.fecha).tareas.push(t));
    Object.entries(dinero).forEach(([f, d]) => {
        const x = dia(f);
        if (c.capas.pagos) x.pagos = d.pagos;
        if (c.capas.gastos) { x.gasto = d.gasto; x.movimientos = d.movimientos; }
    });
    return { porDia, nivel: nivelesGasto(dinero) };
}

const nombreMes = (key) => { const [y, m] = key.split('-').map(Number); return `${MESES[m - 1].charAt(0).toUpperCase() + MESES[m - 1].slice(1)} ${y}`; };
function nombreDia(iso, largo = true) {
    const t = new Date(`${iso}T12:00`).toLocaleDateString('es-MX', largo ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1).replace('.', '');
}
const horaEvento = (e) => (e.todoElDia || !e.horaInicio ? 'Todo el día' : `${e.horaInicio}${e.horaFin ? `–${e.horaFin}` : ''}`);

// ---------- Piezas ----------
function eventoHTML(e) {
    return `<button class="evento" data-action="editarEvento" data-id="${escapeHtml(e.baseId || e.id)}" style="--c:${escapeHtml(e.color || COLORES_EVENTO[0])}">
        <span class="evento-hora">${escapeHtml(horaEvento(e))}</span>
        <span class="evento-titulo">${escapeHtml(e.titulo)}</span>
        ${e.lugar || e.repetir ? `<span class="evento-meta">${e.lugar ? `${escapeHtml(e.lugar)}` : ''}${e.lugar && e.repetir ? ' · ' : ''}${e.repetir ? `${icon('repeat')}Se repite` : ''}</span>` : ''}
    </button>`;
}

const ICONO_PAGO = { pago: 'credit-card', recurrente: 'repeat', ingreso: 'coin', msi: 'check-circle', corte: 'calendar', cobro: 'share' };
function pagoHTML(p) {
    return `<div class="dinero-fila ${p.pagado ? 'pagado' : ''}"><div class="fila-ico">${icon(ICONO_PAGO[p.tipo] || 'coin')}</div>
        <div class="fila-body"><div class="fila-titulo">${escapeHtml(p.titulo)}</div>${p.pagado ? '<div class="fila-sub">Pagado</div>' : p.tipo === 'corte' ? '<div class="fila-sub">Fecha de corte</div>' : ''}</div>
        ${p.monto != null ? `<span class="num privado">${money(p.monto)}</span>` : ''}</div>`;
}

function movimientoHTML(t) {
    const signo = t.tipo === 'ingreso' ? '+' : t.tipo === 'gasto' ? '−' : '';
    const sub = t.tipo === 'transferencia' ? 'Transferencia' : t.paraTercero ? `Para ${t.paraTercero}` : t.abonoDe ? `Abono de ${t.abonoDe}` : (t.categoriaId || '').charAt(0).toUpperCase() + (t.categoriaId || '').slice(1);
    return `<div class="dinero-fila"><div class="fila-ico ${t.tipo === 'ingreso' ? 'tono-pos' : ''}">${icon(t.tipo === 'ingreso' ? 'coin' : t.tipo === 'transferencia' ? 'repeat' : 'tag')}</div>
        <div class="fila-body"><div class="fila-titulo">${escapeHtml(t.desc || (t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'))}</div><div class="fila-sub">${escapeHtml(sub)}</div></div>
        <span class="num privado ${t.tipo === 'ingreso' ? 'pos' : ''}">${signo}${money(Number(t.monto) || 0)}</span></div>`;
}

// Todo lo de un día (debajo del mes, en la vista Día y al tocar un día de la semana).
function detalleDiaHTML(f, d) {
    const x = d || { eventos: [], tareas: [], pagos: [], gasto: 0, movimientos: [] };
    const notas = notasDelDia(sel.notas(), f);
    const vacio = !x.eventos.length && !x.tareas.length && !x.pagos.length && !x.movimientos.length && !notas.length;
    return `<div class="dia-detalle">
        <div class="seccion-head"><h2>${escapeHtml(nombreDia(f))}</h2><button class="link" data-action="calNuevo" data-f="${f}">${icon('plus')}Agregar</button></div>
        ${vacio ? `<section class="card">${vacioTecoHTML('Día libre', 'Nada programado. Toca Agregar para anotar un pendiente o un evento.', 'tranquilo')}</section>` : ''}
        ${x.eventos.length ? `<section class="card eventos-dia">${x.eventos.map(eventoHTML).join('')}</section>` : ''}
        ${x.tareas.length ? `<p class="lista-label">Pendientes</p><section class="card card-flush"><div class="lista-tareas">${x.tareas.map(t => tareaHTML(t, { mostrarFecha: false })).join('')}</div></section>` : ''}
        ${x.pagos.length || x.movimientos.length ? `<p class="lista-label">Dinero</p><section class="card"><div class="dinero">
            ${x.pagos.map(pagoHTML).join('')}${x.movimientos.map(movimientoHTML).join('')}
            ${x.gasto ? `<div class="dinero-pie"><span>Gastaste este día</span><b class="privado">${money(x.gasto)}</b></div>` : ''}</div></section>` : ''}
        ${notas.length ? `<p class="lista-label">Registros</p><div class="notas-grid">${notas.map(notaCardHTML).join('')}</div>` : ''}
    </div>`;
}

// ---------- Vistas ----------
function mesHTML() {
    const key = c.dia.slice(0, 7);
    const { porDia, nivel } = datos(`${key}-01`, ultimoDiaMes(key));
    const h = hoyISO();
    const celda = (f) => {
        if (!f) return '<div class="cal-celda fuera"></div>';
        const x = porDia[f] || {};
        const puntos = [
            ...(x.eventos || []).slice(0, 3).map(e => `<i style="--c:${escapeHtml(e.color || COLORES_EVENTO[0])}"></i>`),
            ...((x.tareas || []).some(t => !t.hecha) ? ['<i class="p-tarea"></i>'] : []),
            ...((x.pagos || []).some(p => p.tipo !== 'corte' && !p.pagado) ? ['<i class="p-pago"></i>'] : []),
        ].slice(0, 4).join('');
        return `<button class="cal-celda g${c.capas.gastos ? nivel(x.gasto) : 0} ${f === h ? 'hoy' : ''} ${f === c.dia ? 'sel' : ''}" data-action="calDia" data-f="${f}">
            <span class="cal-num">${Number(f.slice(8))}</span><span class="cal-puntos">${puntos}</span>
            ${c.capas.gastos && x.gasto ? `<span class="cal-gasto privado">${money(x.gasto).replace('.00', '')}</span>` : ''}</button>`;
    };
    return `<div class="cal-mes"><div class="cal-semana">${DIAS.map(d => `<span>${d}</span>`).join('')}</div>
        ${cuadriculaMes(key).map(s => `<div class="cal-fila">${s.map(celda).join('')}</div>`).join('')}</div>
        ${detalleDiaHTML(c.dia, porDia[c.dia])}`;
}

function semanaHTML() {
    const lunes = inicioSemana(c.dia), domingo = sumarDias(lunes, 6);
    const { porDia } = datos(lunes, domingo);
    const h = hoyISO();
    return `<div class="semana">${Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).map(f => {
        const x = porDia[f] || { eventos: [], tareas: [], pagos: [], gasto: 0 };
        const pagos = x.pagos.filter(p => p.tipo !== 'corte');
        const nada = !x.eventos.length && !x.tareas.length && !pagos.length;
        return `<section class="card semana-dia ${f === h ? 'hoy' : ''}">
            <button class="semana-cab" data-action="calIrDia" data-f="${f}"><b>${escapeHtml(nombreDia(f, false))}</b>${x.gasto ? `<span class="muted privado">${money(x.gasto)}</span>` : ''}${icon('chevron-right', 'chev')}</button>
            ${nada ? '<p class="hint" style="margin:4px 0 0;">Libre</p>' : ''}
            ${x.eventos.map(eventoHTML).join('')}
            ${x.tareas.length ? `<div class="lista-tareas">${x.tareas.map(t => tareaHTML(t, { mostrarFecha: false })).join('')}</div>` : ''}
            ${pagos.length ? `<div class="dinero">${pagos.map(pagoHTML).join('')}</div>` : ''}
        </section>`;
    }).join('')}</div>`;
}

function diaHTML() {
    const { porDia } = datos(c.dia, c.dia);
    return detalleDiaHTML(c.dia, porDia[c.dia]);
}

function tituloRango() {
    if (c.vista === 'mes') return nombreMes(c.dia.slice(0, 7));
    if (c.vista === 'semana') {
        const l = inicioSemana(c.dia), d = sumarDias(l, 6);
        const [ml, md] = [Number(l.slice(5, 7)), Number(d.slice(5, 7))];
        return ml === md ? `${Number(l.slice(8))}–${Number(d.slice(8))} de ${MESES[ml - 1]}` : `${Number(l.slice(8))} ${MESES[ml - 1].slice(0, 3)} – ${Number(d.slice(8))} ${MESES[md - 1].slice(0, 3)}`;
    }
    return nombreDia(c.dia);
}

export function render() {
    return `<div class="seg cal-vistas">${Object.entries(VISTAS).map(([k, n]) => `<button class="${c.vista === k ? 'activo' : ''}" data-action="calVista" data-v="${k}">${n}</button>`).join('')}</div>
        <div class="cal-nav">
            <button class="icon-btn" data-action="calMover" data-d="-1" aria-label="Anterior">${icon('chevron-right', 'rot180')}</button>
            <h2 class="cal-titulo">${escapeHtml(tituloRango())}</h2>
            <button class="icon-btn" data-action="calMover" data-d="1" aria-label="Siguiente">${icon('chevron-right')}</button>
            ${c.dia !== hoyISO() ? `<button class="btn btn-soft btn-sm" data-action="calHoy">Hoy</button>` : ''}
        </div>
        <div class="chips chips-scroll capas" style="margin:0 -16px 12px;">${Object.entries(CAPAS).map(([k, n]) => `<button class="chip chip-sm ${c.capas[k] ? 'activo' : ''}" data-action="calCapa" data-c="${k}" aria-pressed="${c.capas[k]}">${c.capas[k] ? icon('check') : ''}${n}</button>`).join('')}</div>
        ${c.vista === 'mes' ? mesHTML() : c.vista === 'semana' ? semanaHTML() : diaHTML()}`;
}

const repintar = () => { const v = document.getElementById('vista'); if (v) v.innerHTML = render(); };
on('calVista', (el) => { c.vista = el.dataset.v; repintar(); });
on('calMover', (el) => {
    const d = Number(el.dataset.d);
    if (c.vista === 'mes') { const k = sumarMeses(c.dia.slice(0, 7), d); c.dia = `${k}-01`; }
    else c.dia = sumarDias(c.dia, d * (c.vista === 'semana' ? 7 : 1));
    repintar();
});
on('calHoy', () => { c.dia = hoyISO(); repintar(); });
on('calDia', (el) => { c.dia = el.dataset.f; repintar(); document.querySelector('.dia-detalle')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
on('calIrDia', (el) => { c.dia = el.dataset.f; c.vista = 'dia'; repintar(); window.scrollTo(0, 0); });
on('calCapa', (el) => { c.capas[el.dataset.c] = !c.capas[el.dataset.c]; guardarCapas(); repintar(); });
on('calNuevo', (el) => abrirNuevo({ fecha: el.dataset.f }));
on('editarEvento', (el) => abrirEvento({ id: el.dataset.id }));

export const diaSeleccionado = () => c.dia;
