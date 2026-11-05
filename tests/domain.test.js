import { test } from 'node:test';
import assert from 'node:assert/strict';

import { clasificar, siguienteFecha, textoRepetir, progreso, cuando, resumenDia, ordenar } from '../js/domain/tareas.js';
import { estadoTeco, consejoAlAzar, CONSEJOS } from '../js/domain/teco.js';
import { pendientesDeDinero, gastoDelDia } from '../js/domain/finanzas.js';

const HOY = new Date(2026, 10, 5, 12); // jueves 5 nov 2026

const t = (id, extra = {}) => ({ id, titulo: id, hecha: false, creadoEn: 1, ...extra });

test('pendientes: se agrupan por cuándo tocan', () => {
    const g = clasificar([
        t('viejo', { fecha: '2026-11-01' }), t('hoy', { fecha: '2026-11-05' }), t('manana', { fecha: '2026-11-06' }),
        t('semana', { fecha: '2026-11-10' }), t('lejos', { fecha: '2026-12-20' }), t('algun'), t('listo', { hecha: true, hechaEn: 5 }),
    ], HOY);
    assert.deepEqual(Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.map(x => x.id)])), {
        atrasadas: ['viejo'], hoy: ['hoy'], manana: ['manana'], proximas: ['semana'], despues: ['lejos'], sinFecha: ['algun'], hechas: ['listo'],
    });
});

test('pendientes: primero los que tienen hora, luego por prioridad', () => {
    const o = ordenar([t('a', { fecha: '2026-11-05', prioridad: 3 }), t('b', { fecha: '2026-11-05', hora: '16:00' }), t('c', { fecha: '2026-11-05', hora: '09:30' }), t('d', { fecha: '2026-11-05', prioridad: 1 })]);
    assert.deepEqual(o.map(x => x.id), ['c', 'b', 'a', 'd']);
});

test('pendientes: repetir nunca deja la fecha en el pasado', () => {
    assert.equal(siguienteFecha('2026-11-05', { cada: 1, unidad: 'dia' }, HOY), '2026-11-06');
    assert.equal(siguienteFecha('2026-11-01', { cada: 1, unidad: 'semana' }, HOY), '2026-11-08');
    assert.equal(siguienteFecha('2026-10-31', { cada: 1, unidad: 'mes' }, HOY), '2026-11-30');   // conserva el fin de mes
    assert.equal(siguienteFecha('2026-01-31', { cada: 3, unidad: 'mes' }, HOY), '2027-01-31');
    assert.equal(siguienteFecha('2025-11-10', { cada: 1, unidad: 'anio' }, HOY), '2026-11-10');
    assert.equal(textoRepetir({ cada: 2, unidad: 'semana' }), 'Cada 2 semanas');
    assert.equal(textoRepetir({ cada: 1, unidad: 'mes' }), 'Cada mes');
});

test('pendientes: subtareas y texto de cuándo', () => {
    assert.deepEqual(progreso({ subtareas: { a: { hecha: true }, b: { hecha: false } } }), { hechas: 1, total: 2 });
    assert.equal(cuando({ fecha: '2026-11-05', hora: '09:30' }, HOY), 'Hoy 09:30');
    assert.equal(cuando({ fecha: '2026-11-06' }, HOY), 'Mañana');
    assert.equal(cuando({ fecha: '2026-11-02' }, HOY), 'Hace 3 días');
    assert.match(cuando({ fecha: '2026-11-13' }, HOY), /13 nov/);
});

test('Teco: su ánimo sigue a tus pendientes', () => {
    assert.equal(estadoTeco([t('x', { fecha: '2026-11-01' })], HOY).estado, 'preocupado');
    const hecha = t('h', { fecha: '2026-11-05', hecha: true, hechaEn: HOY.getTime() });
    assert.equal(estadoTeco([hecha], HOY).estado, 'celebrando');
    assert.equal(estadoTeco([hecha, t('y', { fecha: '2026-11-05' })], HOY).estado, 'contento');
    assert.equal(estadoTeco(Array.from({ length: 8 }, (_, i) => t('z' + i, { fecha: '2026-11-05' })), HOY).estado, 'sorprendido');
    assert.equal(estadoTeco([], HOY).estado, 'tranquilo');
    assert.equal(resumenDia([hecha], HOY).hechasHoy, 1);
    assert.ok(CONSEJOS.length >= 20);
    assert.notEqual(consejoAlAzar(CONSEJOS[0]), CONSEJOS[0]);
});

test('Morralla: lo que vence, cobros de Te deben y gasto del día', () => {
    const v4 = {
        cuentas: { tdc: { nombre: 'Platino', tipo: 'credito', diaCorte: 18, diaPago: 6, saldoInicial: 0, fechaInicial: '2026-01-01' }, deb: { nombre: 'Nómina', tipo: 'debito', saldoInicial: 1000 } },
        transacciones: {
            a: { tipo: 'gasto', monto: 800, fecha: '2026-10-10', cuentaId: 'tdc', categoriaId: 'comida' },
            b: { tipo: 'gasto', monto: 120, fecha: '2026-11-05', cuentaId: 'deb', categoriaId: 'comida' },
            c: { tipo: 'gasto', monto: 900, fecha: '2026-11-05', cuentaId: 'tdc', categoriaId: 'otros', paraTercero: 'Juan' },
        },
        recurrentes: { n: { tipo: 'gasto', desc: 'Netflix', monto: 219, cuentaId: 'tdc', frecuencia: 'mensual', diaMes: 5, activo: true, proximaFecha: '2026-11-05' } },
    };
    const p = pendientesDeDinero(v4, HOY, 1);
    const pago = p.find(x => x.tipo === 'pago');
    assert.equal(pago.titulo, 'Pagar Platino');
    assert.equal(pago.fecha, '2026-11-06');
    assert.equal(pago.monto, 800);
    assert.ok(p.find(x => x.titulo === 'Netflix' && x.fecha === '2026-11-05'));
    assert.equal(gastoDelDia(v4, '2026-11-05'), 120);   // la compra para Juan no cuenta
    assert.deepEqual(pendientesDeDinero({}, HOY), []);
});

// ---------- Fase 2: calendario ----------
import { ocurrencias, eventosEnRango, dineroEnRango, cuadriculaMes, inicioSemana, nivelesGasto } from '../js/domain/calendario.js';

test('eventos: ocurrencias con y sin repetición', () => {
    assert.deepEqual(ocurrencias({ fecha: '2026-11-10' }, '2026-11-01', '2026-11-30'), ['2026-11-10']);
    assert.deepEqual(ocurrencias({ fecha: '2026-12-10' }, '2026-11-01', '2026-11-30'), []);
    assert.deepEqual(ocurrencias({ fecha: '2026-10-07', repetir: { unidad: 'semana', cada: 1 } }, '2026-11-01', '2026-11-30'),
        ['2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25']);
    assert.deepEqual(ocurrencias({ fecha: '2026-01-31', repetir: { unidad: 'mes', cada: 1 } }, '2026-11-01', '2026-12-31'), ['2026-11-30', '2026-12-31']);
    assert.deepEqual(ocurrencias({ fecha: '1990-11-12', repetir: { unidad: 'anio', cada: 1 } }, '2026-11-01', '2026-11-30'), ['2026-11-12']);   // cumpleaños
    const cada2 = ocurrencias({ fecha: '2026-10-30', repetir: { unidad: 'dia', cada: 2 } }, '2026-11-01', '2026-11-06');
    assert.deepEqual(cada2, ['2026-11-01', '2026-11-03', '2026-11-05']);
    const r = eventosEnRango([{ id: 'a', fecha: '2026-11-10', horaInicio: '18:00' }, { id: 'b', fecha: '2026-11-10', todoElDia: true }, { id: 'c', fecha: '2026-11-10', horaInicio: '09:00' }], '2026-11-01', '2026-11-30');
    assert.deepEqual(r.map(e => e.id), ['b', 'c', 'a']);
    assert.equal(r[0].baseId, 'b');
});

test('calendario: cuadrícula, semana y niveles de gasto', () => {
    const s = cuadriculaMes('2026-11');           // 1 nov 2026 es domingo
    assert.equal(s[0].filter(Boolean)[0], '2026-11-01');
    assert.equal(s[0][6], '2026-11-01');
    assert.ok(s.every(semana => semana.length === 7));
    assert.equal(inicioSemana('2026-11-05'), '2026-11-02');
    const nivel = nivelesGasto({ a: { gasto: 100 }, b: { gasto: 120 }, c: { gasto: 5000 }, d: { gasto: 0 } });
    assert.equal(nivel(0), 0);
    assert.equal(nivel(5000), 4);
});

test('calendario: dinero de Morralla por día', () => {
    const v4 = {
        cuentas: { tdc: { nombre: 'Platino', tipo: 'credito', diaCorte: 18, diaPago: 6, saldoInicial: 0, fechaInicial: '2026-01-01' } },
        transacciones: {
            a: { tipo: 'gasto', monto: 800, fecha: '2026-10-10', cuentaId: 'tdc', categoriaId: 'comida' },
            b: { tipo: 'gasto', monto: 120, fecha: '2026-11-03', cuentaId: 'tdc', categoriaId: 'comida' },
            c: { tipo: 'gasto', monto: 600, msi: 3, fecha: '2026-11-03', cuentaId: 'tdc', categoriaId: 'otros', paraTercero: 'Ana' },
        },
        recurrentes: {},
    };
    const d = dineroEnRango(v4, '2026-11-01', '2026-11-30', HOY);
    assert.equal(d['2026-11-03'].gasto, 120);                     // la compra para Ana no cuenta
    assert.equal(d['2026-11-03'].movimientos.length, 2);
    assert.ok(d['2026-11-06'].pagos.find(p => p.titulo === 'Pago Platino' && p.monto === 800));
    assert.ok(d['2026-11-18'].pagos.find(p => p.tipo === 'corte'));
    assert.deepEqual(dineroEnRango({}, '2026-11-01', '2026-11-30'), {});
});

// ---------- Fase 3: registros ----------
import { tituloNota, resumenNota, contarPalabras, etiquetasDe, etiquetasUsadas, filtrarNotas, notasDelDia, agregarDictado } from '../js/domain/notas.js';

test('registros: título, resumen, palabras y etiquetas', () => {
    const n = { contenido: 'Ideas para el viaje\nLlevar #pasaporte\nReservar hotel #viaje' };
    assert.equal(tituloNota(n), 'Ideas para el viaje');
    assert.equal(resumenNota(n), 'Llevar #pasaporte · Reservar hotel #viaje');
    assert.equal(tituloNota({ titulo: 'Junta', contenido: 'x' }), 'Junta');
    assert.equal(tituloNota({ contenido: '' }), 'Sin título');
    assert.equal(contarPalabras('  hola   mundo bonito '), 3);
    assert.deepEqual(etiquetasDe({ ...n, etiquetas: ['Viaje', 'trabajo'] }), ['viaje', 'trabajo', 'pasaporte']);
    assert.deepEqual(etiquetasUsadas([n, { contenido: '#viaje otra' }]), ['viaje', 'pasaporte']);
});

test('registros: filtros, búsqueda sin acentos y orden', () => {
    const notas = [
        { id: 'a', tipo: 'nota', contenido: 'Lista del súper', editadoEn: 1, fecha: '2026-11-05' },
        { id: 'b', tipo: 'apunte', contenido: 'Clase de cálculo #escuela', editadoEn: 3, fecha: '2026-11-04' },
        { id: 'c', tipo: 'transcripcion', contenido: 'Llamada con el banco', editadoEn: 2, fijada: true, fecha: '2026-11-05' },
    ];
    assert.deepEqual(filtrarNotas(notas).map(n => n.id), ['c', 'b', 'a']);
    assert.deepEqual(filtrarNotas(notas, { tipo: 'apunte' }).map(n => n.id), ['b']);
    assert.deepEqual(filtrarNotas(notas, { tipo: 'fijadas' }).map(n => n.id), ['c']);
    assert.deepEqual(filtrarNotas(notas, { q: 'calculo' }).map(n => n.id), ['b']);
    assert.deepEqual(filtrarNotas(notas, { etiqueta: 'escuela' }).map(n => n.id), ['b']);
    assert.deepEqual(notasDelDia(notas, '2026-11-05').map(n => n.id), ['c', 'a']);
});

test('registros: el dictado se une con espacio y mayúscula', () => {
    assert.equal(agregarDictado('', 'hola qué tal'), 'Hola qué tal');
    assert.equal(agregarDictado('Hola', 'qué tal'), 'Hola qué tal');
    assert.equal(agregarDictado('Listo.', 'otra cosa'), 'Listo. Otra cosa');
    assert.equal(agregarDictado('Uno\n', 'dos'), 'Uno\nDos');
    assert.equal(agregarDictado('Igual', '   '), 'Igual');
});
