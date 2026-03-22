/**
 * ETIQUETA DE VERSIÓN: v1.1.1
 * script.js - Actualizado para sincronización JSON
 */
const urlParams = new URLSearchParams(window.location.search);
const folderId = urlParams.get('folderId');
const scriptURL = "https://script.google.com/macros/s/AKfycbyBPNMXumKjCnk7_BneSPi4AKVKl22YkJXNp28CiRQLc21ndsHvhS5hGvjFaZBwhpQ/exec";

let ultimoQR = ""; 
let estadoPermiso = "IN"; 
let CONFIG_WEB = {}; 

// ELEMENTOS DOM
const statusDiv = document.getElementById('status');
const preview = document.getElementById('preview');
const btnEnviar = document.getElementById('btnEnviar');
const btnPermiso = document.getElementById('btnPermiso');
const btnReset = document.getElementById('btnReset');
const checkAula = document.getElementById('checkAula');
const checkCasa = document.getElementById('checkCasa');

// INICIALIZACIÓN AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    if (!folderId) {
        statusDiv.innerHTML = "<b style='color:red'>Error: Falta ID de Carpeta</b>";
        return;
    }
    cargarConfiguracion();
});

function cargarConfiguracion() {
    statusDiv.innerText = "Cargando configuración del sistema...";
    fetch(`${scriptURL}?accion=LOAD_CONFIG`)
        .then(r => r.json())
        .then(config => {
            CONFIG_WEB = config;
            statusDiv.innerText = "Sistema Listo. Esperando QR...";
            startScanner();
        })
        .catch(err => {
            statusDiv.innerHTML = "<b style='color:red'>Error al conectar con Configuración</b>";
        });
}

// FUNCIONES DE ESCANEO
function startScanner() {
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 2, qrbox: 250 },
        onScanSuccess
    );
}


function onScanSuccess(decodedText) {
    if (decodedText !== ultimoQR) {
        ultimoQR = decodedText;
        const partes = decodedText.split(',');
        if (partes.length >= 4) {
            actualizarInterfaz(partes);
            consultarEstadoAlumno();
        }
    }
}

function consultarEstadoAlumno() {
    statusDiv.innerText = "Consultando estado previo...";
    const url = `${scriptURL}?qr=${encodeURIComponent(ultimoQR)}&folderId=${folderId}&accion=CONSULTAR`;

    fetch(url)
    .then(r => r.json())
    .then(res => {
            if (res.success && res.data.registrado) {
                checkAula.checked = (res.data.oAula === "SI");
                checkCasa.checked = (res.data.oCasa === "SI");
                
                // NUEVO: Sincronizar el estado del botón de salida
                estadoPermiso = res.data.enPermiso ? "OUT" : "IN";
                actualizarBotonPermiso();

                statusDiv.innerText = "Registro recuperado.";
            } else {
                checkAula.checked = false;
                checkCasa.checked = false;
                
                // NUEVO: Resetear el botón si es alumno nuevo hoy
                estadoPermiso = "IN";
                actualizarBotonPermiso();
                
                statusDiv.innerText = "Nuevo registro para hoy.";
            }
            statusDiv.style.color = "#27ae60"; 
        })
    .catch(() => {
        statusDiv.innerText = "Error al consultar estado previo.";
    });
}

function actualizarInterfaz(partes) {
    document.getElementById('viewNombre').innerText = partes[1].trim();
    document.getElementById('viewCurso').innerText = partes[2].trim();
    document.getElementById('viewMateria').innerText = partes[3].trim();

    // LIMPIEZA: Cada vez que entra un alumno nuevo, empezamos de cero
    checkAula.checked = false;
    checkCasa.checked = false;

    // Mostrar el panel de incidencias
    const incidenciasSection = document.getElementById('incidenciasSection');
    incidenciasSection.style.display = "block";
    btnEnviar.style.display = "inline-block";
    preview.style.display = "block";
    
    statusDiv.innerText = "Ficha de sesión activa";
    statusDiv.style.color = "#1a73e8";
}

// GESTIÓN DE EVENTOS (LISTENERS)
btnEnviar.addEventListener('click', () => {
    ejecutarAccion("ASISTENCIA");
});

btnPermiso.addEventListener('click', () => {
    const accion = (estadoPermiso === "IN") ? "SALIDA" : "RETORNO";
    ejecutarAccion(accion);
});

btnReset.addEventListener('click', resetFicha);

// COMUNICACIÓN CON EL SERVIDOR (ACTUALIZADO A JSON)
function ejecutarAccion(accion) {
    statusDiv.innerText = "Sincronizando...";
    statusDiv.style.color = "#1a73e8";
    
    const oAula = checkAula.checked ? "SI" : "NO";
    const oCasa = checkCasa.checked ? "SI" : "NO";

    const url = `${scriptURL}?qr=${encodeURIComponent(ultimoQR)}&folderId=${folderId}` +
                `&accion=${accion}&oAula=${oAula}&oCasa=${oCasa}`;

    fetch(url)
    .then(r => r.json()) // Cambiado a JSON
    .then(res => {
        if (res.success) {
            console.log(res);
            // Sincronización visual con la respuesta del servidor
            statusDiv.innerText = `${res.message} (SER: ${res.data.ser} | HACER: ${res.data.hacer})`;
            statusDiv.style.color = "green";

            // Sincronizamos los checks con lo que el servidor confirmó
            checkAula.checked = (res.data.oAula === "SI");
            checkCasa.checked = (res.data.oCasa === "SI");

            // Si es un proceso de permiso, actualizamos el botón solo tras el éxito
            if (accion === "SALIDA") {
                estadoPermiso = "OUT";
                actualizarBotonPermiso();
            } else if (accion === "RETORNO") {
                estadoPermiso = "IN";
                actualizarBotonPermiso();
            }

            // Limpiamos la pantalla después de 3 segundos
            //setTimeout(resetFicha, 3000);
        } else {
            statusDiv.innerText = "❌ " + res.message;
            statusDiv.style.color = "red";
        }
    })
    .catch((err) => {
        statusDiv.innerText = "❌ Error de red o servidor";
        statusDiv.style.color = "red";
        console.error(err);
    });
}

function actualizarBotonPermiso() {
    if (estadoPermiso === "OUT") {
        btnPermiso.innerText = "RETORNO (En proceso...)";
        btnPermiso.style.background = "#2c3e50";
    } else {
        btnPermiso.innerText = "SALIDA BAÑO/AULA";
        btnPermiso.style.background = "#3498db";
    }
}

function resetFicha() {
    ultimoQR = "";
    estadoPermiso = "IN";
    checkAula.checked = false;
    checkCasa.checked = false;
    preview.style.display = "none";
    btnEnviar.style.display = "none";
    document.getElementById('incidenciasSection').style.display = "none";
    btnPermiso.innerText = "SALIDA BAÑO/AULA";
    btnPermiso.style.background = "#3498db";
    statusDiv.innerText = "Esperando código QR...";
    statusDiv.style.color = "#1a73e8";
}
