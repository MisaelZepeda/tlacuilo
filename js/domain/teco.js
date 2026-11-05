// Teco, el tecolote: su ánimo según tus pendientes y consejos de organización.
//
//   preocupado   tienes pendientes atrasados
//   celebrando   terminaste todo lo de hoy (y hiciste al menos uno)
//   sorprendido  hoy tienes 8 pendientes o más
//   contento     vas avanzando: ya terminaste alguno hoy
//   tranquilo    lo demás

import { resumenDia } from './tareas.js';

export function estadoTeco(tareas, hoy = new Date()) {
    const r = resumenDia(tareas, hoy);
    const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
    if (r.atrasadas) return { estado: 'preocupado', mensaje: `Tienes ${plural(r.atrasadas, 'pendiente atrasado', 'pendientes atrasados')}. ¿Lo hacemos hoy o le cambiamos la fecha?`, ruta: '#/pendientes?vista=hoy' };
    if (r.hechasHoy && !r.hoy) return { estado: 'celebrando', mensaje: `¡Terminaste todo lo de hoy! ${plural(r.hechasHoy, 'pendiente listo', 'pendientes listos')}.`, ruta: '#/pendientes?vista=proximos' };
    if (r.hoy >= 8) return { estado: 'sorprendido', mensaje: `¡Uf! ${r.hoy} pendientes para hoy. Elige los 3 más importantes y mueve el resto.`, ruta: '#/pendientes?vista=hoy' };
    if (r.hechasHoy) return { estado: 'contento', mensaje: `Vas bien: ${plural(r.hechasHoy, 'listo', 'listos')} y ${plural(r.hoy, 'por hacer', 'por hacer')} hoy.`, ruta: '#/pendientes?vista=hoy' };
    if (r.hoy) return { estado: 'tranquilo', mensaje: `Hoy tienes ${plural(r.hoy, 'pendiente', 'pendientes')}. Empieza por el que más te cuesta.`, ruta: '#/pendientes?vista=hoy' };
    return { estado: 'tranquilo', mensaje: r.total ? 'Nada para hoy. Buen momento para adelantar algo de la semana.' : 'Todo en orden. Anota lo que tengas en mente para que no se te olvide.', ruta: '#/pendientes?vista=proximos' };
}

export const CONSEJOS = [
    'Si algo toma menos de dos minutos, hazlo de una vez en lugar de anotarlo.',
    'Elige tus 3 pendientes más importantes del día antes de abrir el correo.',
    'Anota todo lo que tengas en la cabeza: tu memoria es para pensar, no para guardar.',
    'Divide lo grande en pasos pequeños. "Organizar la casa" no se puede hacer; "Ordenar el cajón" sí.',
    'Agrupa tareas parecidas: todas las llamadas juntas, todos los pagos juntos.',
    'Revisa tu semana cada domingo: qué quedó pendiente y qué viene.',
    'Ponle fecha a lo importante. Lo que no tiene fecha casi nunca se hace.',
    'Haz primero la tarea que más te cuesta; el resto del día se siente más ligero.',
    'Si un pendiente lleva semanas moviéndose, quizá no es importante: bórralo sin culpa.',
    'Deja espacios libres en tu agenda: siempre surge algo.',
    'Trabaja en bloques de 25 minutos y descansa 5. Tu cabeza te lo agradecerá.',
    'Prepara mañana desde hoy: deja lista la lista de pendientes antes de dormir.',
    'Una cosa a la vez. Hacer varias al mismo tiempo cansa más y rinde menos.',
    'Usa listas por contexto: Casa, Trabajo, Compras. Así ves solo lo que puedes hacer ahí.',
    'Celebra lo que terminas, aunque sea pequeño. Tachar también motiva.',
    'Los pagos con fecha límite van primero: un recargo es dinero tirado.',
    'Si te sientes saturado, escribe todo y luego decide: hacer, programar, delegar o soltar.',
    'Las mañanas suelen ser mejores para pensar; las tardes, para tareas sencillas.',
    'Repite lo que funciona: convierte tus hábitos en pendientes que se repiten.',
    'Pon la hora a tus citas y un pendiente antes para prepararte.',
    'No llenes el día con 20 cosas: mejor 5 que sí terminas.',
    'Cuando termines algo, anota el siguiente paso para no perder el hilo.',
    'Revisa tus pendientes atrasados una vez al día y decide qué hacer con cada uno.',
    'Lo que se mide mejora: fíjate cuántos pendientes cierras por semana.',
    'Un lugar para todo: si lo anotas en un solo sitio, lo encuentras rápido.',
];

export function consejoAlAzar(excepto = null) {
    const opciones = CONSEJOS.filter(c => c !== excepto);
    return opciones[Math.floor(Math.random() * opciones.length)];
}
