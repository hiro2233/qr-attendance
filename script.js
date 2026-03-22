// CONFIGURACIÓN
const urlParams = new URLSearchParams(window.location.search);
const folderId = urlParams.get('folderId');
const scriptURL = "https://script.google.com/macros/s/AKfycbwYOKUtvhk_XuVV4W2Z4otm82PIx6b6sLC2MwOv2KE9fUH9V7m9ytmdMsWIcCabZFlA/exec"; // REEMPLAZAR AQUÍ

let ultimoQR = ""; 
let estadoPermiso = "IN"; 

// ELEMENTOS DOM
const btnEnviar = document.getElementById('btnEnviar');
const btnPermiso = document.getElementById('btnPermiso');
const btnReset = document.getElementById('btnReset');
const statusDiv = document.getElementById('status');
const preview = document.getElementById('preview');
const incidenciasSection = document.getElementById('incidenciasSection');
const checkAula = document.getElementById('checkAula');
const checkCasa = document.getElementById('checkCasa');

// INICIALIZACIÓN
if (!folderId) {
    statusDiv.innerHTML = "<b style='color:red'>Error: Falta ID de Carpeta</b>";
} else {
    startScanner();
}

// FUNCIONES DE ESCANEO
function startScanner() {
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: 250 },
        onScanSuccess
    );
}

function onScanSuccess(decodedText) {
    if (decodedText !== ultimoQR) {
        ultimoQR = decodedText;
        const partes = decodedText.split(',');
        if (partes.length >= 4) {
            actualizarInterfaz(partes);
        }
    }
}

function actualizarInterfaz(partes) {
    document.getElementById('viewNombre').innerText = partes[1].trim();
    document.getElementById('viewCurso').innerText = partes[2].trim();
    document.getElementById('viewMateria').innerText = partes[3].trim();
    
    preview.style.display = "block";
    incidenciasSection.style.display = "block";
    btnEnviar.style.display = "inline-block";
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
    actualizarBotonPermiso();
});

btnReset.addEventListener('click', resetFicha);

// COMUNICACIÓN CON EL SERVIDOR
function ejecutarAccion(accion) {
    statusDiv.innerText = "Sincronizando con el servidor...";
    
    // Obtenemos valores booleanos de los checks
    const oAula = checkAula.checked ? "SI" : "NO";
    const oCasa = checkCasa.checked ? "SI" : "NO";

    // Construimos la URL con los nuevos parámetros de estado
    const url = `${scriptURL}?qr=${encodeURIComponent(ultimoQR)}&folderId=${folderId}` +
                `&accion=${accion}` +
                `&oAula=${oAula}` +
                `&oCasa=${oCasa}`;

    fetch(url)
    .then(r => r.text())
    .then(texto => {
        statusDiv.innerText = texto;
        statusDiv.style.color = texto.includes("✅") ? "green" : "red";
    })
    .catch(err => {
        statusDiv.innerText = "❌ Error de red";
        statusDiv.style.color = "red";
    });
}

function actualizarBotonPermiso() {
    if (estadoPermiso === "IN") {
        btnPermiso.innerText = "RETORNO (En proceso...)";
        btnPermiso.style.background = "#2c3e50";
        estadoPermiso = "OUT";
    } else {
        btnPermiso.innerText = "SALIDA BAÑO/AULA";
        btnPermiso.style.background = "#3498db";
        estadoPermiso = "IN";
    }
}

function resetFicha() {
    ultimoQR = "";
    estadoPermiso = "IN";
    
    // Desmarcar los checkboxes al limpiar la ficha
    checkAula.checked = false;
    checkCasa.checked = false;
    
    preview.style.display = "none";
    btnEnviar.style.display = "none";
    btnPermiso.innerText = "SALIDA BAÑO/AULA";
    btnPermiso.style.background = "#3498db";
    statusDiv.innerText = "Esperando código QR...";
    statusDiv.style.color = "#1a73e8";
}
