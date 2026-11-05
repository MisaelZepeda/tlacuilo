// Avisos de Tlacuilo para los próximos 7 días. Función pura: la app los calcula
// y los manda al Worker, que los envía a su hora aunque la app esté cerrada.
//
//   resumen      cada mañana (8:00): pendientes y eventos del día, y atrasados
//   pendiente    a la hora del pendiente (si tiene hora)
//   evento       15 minutos antes (los de todo el día van en el resumen)
//   mañana       21:00: un vistazo a lo de mañana, si hay algo

import { hoyISO, sumarDias, aFecha } from './fechas.js';
import { eventosEnRango } from './calendario.js';

const DIAS = 7;

export function momento(fecha, hora) {
    const d = aFecha(fecha);
    const [h, m] = hora.split(':').map(Number);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
}

const lista = (titulos, max = 3) => titulos.slice(0, max).join(', ') + (titulos.length > max ? ` y ${titulos.length - max} más` : '');
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export function calcularAvisos({ tareas = [], eventos = [] }, ahora = new Date(), { horaResumen = '08:00', minutosAntes = 15, horaManana = '21:00' } = {}) {
    const h = hoyISO(ahora), hasta = sumarDias(h, DIAS);
    const desdeMs = ahora.getTime() - 60000, hastaMs = momento(hasta, '23:59');
    const avisos = [];
    const agregar = (a) => { if (a.at >= desdeMs && a.at <= hastaMs) avisos.push(a); };
    const abiertas = tareas.filter(t => !t.hecha);
    const evs = eventosEnRango(eventos, h, hasta);

    // Pendientes con hora: a su hora.
    abiertas.filter(t => t.fecha && t.hora && t.fecha >= h && t.fecha <= hasta).forEach(t => {
        agregar({ id: `tarea:${t.id}:${t.fecha}:${t.hora}`, at: momento(t.fecha, t.hora), title: t.titulo, body: 'Es hora de este pendiente. Tócalo para verlo.', url: '#/pendientes?vista=hoy' });
    });

    // Eventos con hora: unos minutos antes.
    evs.filter(e => !e.todoElDia && e.horaInicio).forEach(e => {
        const at = momento(e.fecha, e.horaInicio) - minutosAntes * 60000;
        agregar({ id: `evento:${e.baseId}:${e.fecha}:${e.horaInicio}`, at, title: `En ${minutosAntes} min: ${e.titulo}`, body: `${e.horaInicio}${e.horaFin ? `–${e.horaFin}` : ''}${e.lugar ? ` · ${e.lugar}` : ''}`, url: `#/calendario?dia=${e.fecha}&vista=dia` });
    });

    // Resumen de cada mañana (Teco).
    for (let i = 0; i <= DIAS; i++) {
        const f = sumarDias(h, i);
        const delDia = abiertas.filter(t => t.fecha === f);
        const atrasadas = i === 0 ? abiertas.filter(t => t.fecha && t.fecha < h) : [];
        const eventosDia = evs.filter(e => e.fecha === f);
        if (!delDia.length && !eventosDia.length && !atrasadas.length) continue;
        const partes = [];
        if (eventosDia.length) partes.push(`${plural(eventosDia.length, 'evento', 'eventos')}: ${lista(eventosDia.map(e => e.titulo))}`);
        if (delDia.length) partes.push(`${plural(delDia.length, 'pendiente', 'pendientes')}: ${lista(delDia.map(t => t.titulo))}`);
        if (atrasadas.length) partes.push(`${plural(atrasadas.length, 'atrasado', 'atrasados')}`);
        agregar({ id: `resumen:${f}`, at: momento(f, horaResumen), title: 'Buenos días, Teco aquí', body: `Hoy tienes ${partes.join('. ')}.`, url: '#/hoy' });
    }

    // Vistazo a mañana, cada noche.
    for (let i = 0; i < DIAS; i++) {
        const f = sumarDias(h, i), sig = sumarDias(f, 1);
        const pend = abiertas.filter(t => t.fecha === sig).length, ev = evs.filter(e => e.fecha === sig);
        if (!pend && !ev.length) continue;
        const primero = ev.filter(e => e.horaInicio && !e.todoElDia).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))[0];
        agregar({ id: `manana:${sig}`, at: momento(f, horaManana), title: 'Para mañana', body: `${[ev.length ? plural(ev.length, 'evento', 'eventos') : '', pend ? plural(pend, 'pendiente', 'pendientes') : ''].filter(Boolean).join(' y ')}${primero ? `. Empiezas a las ${primero.horaInicio}: ${primero.titulo}` : ''}.`, url: '#/pendientes?vista=proximos' });
    }

    return avisos.sort((a, b) => a.at - b.at).slice(0, 250);
}

// Día de la semana para textos (sin depender del idioma del dispositivo).
export const diaSemana = (fecha) => ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][aFecha(fecha).getDay()];
