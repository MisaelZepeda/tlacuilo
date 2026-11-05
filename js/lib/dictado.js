// Dictado con el reconocimiento de voz del navegador (Web Speech API, español de México).
// En iPhone funciona en Safari; si no está disponible, queda el micrófono del teclado.

const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;

export const dictadoDisponible = () => !!Reconocimiento;

let activo = null;

// iniciarDictado({ alTexto(final), alParcial(texto), alTerminar(error?) }) → detener()
export function iniciarDictado({ alTexto, alParcial, alTerminar }) {
    detenerDictado();
    if (!Reconocimiento) { alTerminar?.('no-disponible'); return () => {}; }
    const r = new Reconocimiento();
    r.lang = 'es-MX';
    r.continuous = true;
    r.interimResults = true;
    let detenido = false;
    r.onresult = (e) => {
        let parcial = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const texto = e.results[i][0].transcript;
            if (e.results[i].isFinal) alTexto?.(texto); else parcial += texto;
        }
        alParcial?.(parcial);
    };
    r.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') { detenido = true; alTerminar?.(e.error); } };
    // iOS corta el dictado tras unos segundos de silencio: se reanuda mientras siga activo.
    r.onend = () => {
        if (!detenido && activo === r) { try { r.start(); return; } catch { /* ya no se puede */ } }
        if (activo === r) activo = null;
        alParcial?.('');
        if (!detenido) alTerminar?.();
    };
    try { r.start(); } catch (err) { alTerminar?.(String(err)); return () => {}; }
    activo = r;
    return () => { detenido = true; activo = null; try { r.stop(); } catch { /* ya terminó */ } alParcial?.(''); alTerminar?.(); };
}

export function detenerDictado() {
    const r = activo;
    activo = null;
    try { r?.stop(); } catch { /* ya terminó */ }
}

export const dictando = () => !!activo;
