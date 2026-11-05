// Datos de ejemplo para la demo: una agenda y un poco de Morralla (para la sección Dinero).

import { hoyISO, sumarDias, mesKey, sumarMeses, aFecha } from '../domain/fechas.js';

export function construirDemo(hoy = new Date()) {
    const h = hoyISO(hoy);
    const d = (n) => sumarDias(h, n);
    const listas = {
        personal: { nombre: 'Personal', color: '#5b3df5', orden: 0 },
        trabajo: { nombre: 'Trabajo', color: '#2a78d6', orden: 1 },
        casa: { nombre: 'Casa', color: '#13855c', orden: 2 },
        compras: { nombre: 'Compras', color: '#d97706', orden: 3 },
    };
    let n = 0;
    const tareas = {};
    const t = (x) => { tareas[`demo${n++}`] = { prioridad: 0, hecha: false, creadoEn: n, ...x }; };
    t({ titulo: 'Junta con el equipo', fecha: h, hora: '10:00', listaId: 'trabajo', prioridad: 2 });
    t({ titulo: 'Dentista', fecha: h, hora: '17:30', listaId: 'personal', nota: 'Llevar la credencial del seguro.' });
    t({ titulo: 'Enviar reporte mensual', fecha: h, listaId: 'trabajo', prioridad: 3, subtareas: { a: { texto: 'Juntar cifras', hecha: true, orden: 0 }, b: { texto: 'Revisar gráficas', hecha: false, orden: 1 }, c: { texto: 'Mandar por correo', hecha: false, orden: 2 } } });
    t({ titulo: 'Regar las plantas', fecha: h, listaId: 'casa', repetir: { cada: 3, unidad: 'dia' } });
    t({ titulo: 'Leer 20 minutos', fecha: h, listaId: 'personal', hecha: true, hechaEn: Date.now() - 3600e3 });
    t({ titulo: 'Renovar licencia', fecha: d(-2), listaId: 'personal', prioridad: 2 });
    t({ titulo: 'Comprar despensa', fecha: d(1), listaId: 'compras', subtareas: { a: { texto: 'Leche', hecha: false, orden: 0 }, b: { texto: 'Huevo', hecha: false, orden: 1 }, c: { texto: 'Café', hecha: false, orden: 2 } } });
    t({ titulo: 'Cambiar filtro del agua', fecha: d(2), listaId: 'casa', repetir: { cada: 3, unidad: 'mes' } });
    t({ titulo: 'Cumpleaños de mamá', fecha: d(4), hora: '19:00', listaId: 'personal', prioridad: 3 });
    t({ titulo: 'Planear vacaciones de diciembre', listaId: 'personal' });
    t({ titulo: 'Aprender a usar atajos de Siri' });

    // Morralla mínima: una tarjeta que vence mañana, un pago fijo hoy y un gasto de hoy.
    const manana = aFecha(d(1));
    const diaPago = manana.getDate();
    const corte = mesKey(sumarMeses(mesKey(hoy), -1));
    const v4 = {
        perfil: { nombre: 'Cuenta Demo' },
        cuentas: {
            platino: { nombre: 'Platino', banco: 'Santander', tipo: 'credito', diaCorte: Math.max(1, diaPago - 18 > 0 ? diaPago - 18 : diaPago + 10), diaPago, limite: 30000, saldoInicial: 0, fechaInicial: `${corte}-01` },
            nomina: { nombre: 'Nómina', tipo: 'debito', saldoInicial: 12000, fechaInicial: `${corte}-01` },
        },
        transacciones: {
            g1: { tipo: 'gasto', monto: 2350, fecha: `${corte}-${String(Math.min(28, diaPago)).padStart(2, '0')}`, cuentaId: 'platino', categoriaId: 'comida', desc: 'Súper' },
            g2: { tipo: 'gasto', monto: 1200, fecha: d(-25), cuentaId: 'platino', categoriaId: 'ocio', desc: 'Cine' },
            g3: { tipo: 'gasto', monto: 185, fecha: h, cuentaId: 'nomina', categoriaId: 'comida', desc: 'Comida' },
        },
        recurrentes: {
            net: { tipo: 'gasto', desc: 'Netflix', monto: 219, cuentaId: 'platino', frecuencia: 'mensual', diaMes: aFecha(h).getDate(), activo: true, proximaFecha: h, categoriaId: 'suscripciones' },
        },
    };
    const eventos = {
        e1: { titulo: 'Comida con Laura', fecha: h, horaInicio: '14:00', horaFin: '15:30', lugar: 'Café Tacuba', color: '#d97706', creadoEn: 1 },
        e2: { titulo: 'Clase de natación', fecha: d(-14), horaInicio: '07:00', horaFin: '08:00', color: '#2a78d6', repetir: { unidad: 'semana', cada: 1 }, creadoEn: 2 },
        e3: { titulo: 'Cumpleaños de Pepe', fecha: `1992-${h.slice(5, 7)}-${String(Math.min(28, Number(d(3).slice(8)))).padStart(2, '0')}`, todoElDia: true, color: '#c2185b', repetir: { unidad: 'anio', cada: 1 }, creadoEn: 3 },
        e4: { titulo: 'Viaje a Oaxaca', fecha: d(9), todoElDia: true, color: '#13855c', nota: 'Vuelo a las 8:40', creadoEn: 4 },
        e5: { titulo: 'Revisión con el contador', fecha: d(2), horaInicio: '11:00', horaFin: '12:00', lugar: 'Videollamada', color: '#5b3df5', creadoEn: 5 },
    };
    const hace = (horas) => Date.now() - horas * 3600e3;
    const notas = {
        n1: { tipo: 'apunte', titulo: 'Junta de planeación', contenido: 'Objetivos del trimestre:\n- Cerrar el reporte antes del 15\n- Revisar presupuesto con finanzas\n- Contratar a una persona para soporte\n#trabajo #q4', fecha: h, creadoEn: hace(3), editadoEn: hace(2), fijada: true },
        n2: { tipo: 'nota', titulo: '', contenido: 'Regalos de Navidad\nMamá: libro de cocina\nPepe: audífonos\nLaura: planta #navidad', fecha: d(-1), creadoEn: hace(26), editadoEn: hace(25) },
        n3: { tipo: 'transcripcion', titulo: 'Idea en el coche', contenido: 'Podría organizar los pendientes de la casa por cuarto y hacer uno distinto cada sábado. Así no se junta todo el fin de mes.', fecha: d(-3), creadoEn: hace(72), editadoEn: hace(72) },
        n5: { tipo: 'lista', titulo: 'Súper del sábado', contenido: '', fecha: h, creadoEn: hace(5), editadoEn: hace(1), items: {
            a: { texto: 'Leche', hecho: true, orden: 0 }, b: { texto: 'Huevo', hecho: true, orden: 1 }, c: { texto: 'Pan integral', hecho: false, orden: 2 },
            d: { texto: 'Café', hecho: false, orden: 3 }, e: { texto: 'Plátanos', hecho: false, orden: 4 }, f: { texto: 'Detergente', hecho: false, orden: 5 } } },
        n4: { tipo: 'nota', titulo: 'Contraseña del wifi de la oficina', contenido: 'Pedírsela a Carlos, no la tengo anotada.', fecha: d(-6), creadoEn: hace(150), editadoEn: hace(150) },
    };
    return { agenda: { meta: { version: 1, origen: 'demo' }, ajustes: {}, listas, tareas, eventos, notas }, v4 };
}
