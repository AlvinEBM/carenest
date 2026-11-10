// =================================================================
// PRUEBA AUTOMATIZADA DE INTERFAZ (E2E) — CareNest con Selenium WebDriver
// Recorre el sistema como lo haría un paciente, en un navegador Chrome real:
//   SEL-01 Crear cuenta · SEL-02 Login incorrecto · SEL-03 Login correcto
//   SEL-04 Reservar cita · SEL-05 Reprogramar cita · SEL-06 Cancelar cita
// Requisitos: backend (http://localhost:3002) y frontend (http://localhost:5173)
// encendidos, y Google Chrome instalado (Selenium descarga el driver solo).
// =================================================================
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const URL = process.env.CARENEST_URL || 'http://localhost:5173';
const CAPTURAS = path.join(__dirname, '..', 'capturas');
const ESPERA = 10000;

// Paciente nuevo en cada ejecución (DNI, teléfono y correo únicos)
const n = String(Date.now()).slice(-7);
const PACIENTE = {
    nombres: 'Teresa', apellidos: 'Selenium Prueba', dni: '6' + n, telefono: '97' + n,
    correo: `selenium.${n}@gmail.com`, contrasena: 'Selenium2026',
};

let driver;

// ---------- utilidades ----------
// Elemento más interno que contiene el texto (aunque tenga íconos al lado)
const xpTexto = (texto) => `//*[contains(normalize-space(.), ${JSON.stringify(texto)}) and not(*[contains(normalize-space(.), ${JSON.stringify(texto)})])]`;
const boton = (texto) => By.xpath(`//button[normalize-space(.)=${JSON.stringify(texto)}]`);

async function captura(nombre) {
    fs.mkdirSync(CAPTURAS, { recursive: true });
    fs.writeFileSync(path.join(CAPTURAS, `${nombre}.png`), await driver.takeScreenshot(), 'base64');
}
async function esperarTexto(texto) {
    return driver.wait(until.elementLocated(By.xpath(xpTexto(texto))), ESPERA, `No apareció el texto «${texto}»`);
}
async function clic(locator) {
    const el = await driver.wait(until.elementLocated(locator), ESPERA);
    await driver.wait(until.elementIsEnabled(el), ESPERA);
    await driver.executeScript('arguments[0].scrollIntoView({block: "center"})', el);
    await el.click();
    return el;
}
// Campo por su etiqueta visible (<label for="..."> asociado al <input id="...">)
async function campo(etiqueta) {
    const label = await driver.wait(until.elementLocated(By.xpath(`//label[normalize-space(.)=${JSON.stringify(etiqueta)}]`)), ESPERA);
    return driver.findElement(By.id(await label.getAttribute('for')));
}
async function escribir(etiqueta, valor) {
    const el = await campo(etiqueta);
    await el.clear();
    await el.sendKeys(valor);
}
// React: cambiar el valor de un <input type="date"> y avisar a la página
async function ponerFecha(el, fecha) {
    await driver.executeScript(`
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        set.call(arguments[0], arguments[1]);
        arguments[0].dispatchEvent(new Event('input', { bubbles: true }));`, el, fecha);
}
async function iniciarSesion(correo, contrasena) {
    await driver.get(`${URL}/login`);
    const email = await driver.wait(until.elementLocated(By.css('input[type=email]')), ESPERA);
    await email.clear(); await email.sendKeys(correo);
    const clave = await driver.findElement(By.css('input[type=password]'));
    await clave.clear(); await clave.sendKeys(contrasena);
    await driver.findElement(By.css('button[type=submit]')).click();
}
const isoMas = (iso, dias) => {
    const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
};

describe('CareNest — prueba E2E del paciente con Selenium', function () {
    let fechaCita; // YYYY-MM-DD de la cita reservada

    before(async () => {
        const opciones = new chrome.Options().addArguments('--window-size=1366,900', '--lang=es-PE');
        if (process.env.HEADLESS) opciones.addArguments('--headless=new');
        driver = await new Builder().forBrowser('chrome').setChromeOptions(opciones).build();
    });
    after(async () => { if (driver) await driver.quit(); });

    it('SEL-01 Crear cuenta de paciente nuevo', async () => {
        await driver.get(`${URL}/registro`);
        await escribir('Nombres', PACIENTE.nombres);
        await escribir('Apellidos', PACIENTE.apellidos);
        await escribir('DNI', PACIENTE.dni);
        await escribir('Teléfono (celular)', PACIENTE.telefono);
        await escribir('Correo electrónico', PACIENTE.correo);
        await escribir('Contraseña', PACIENTE.contrasena);
        await escribir('Confirmar contraseña', PACIENTE.contrasena);
        await clic(boton('Crear cuenta →'));
        await esperarTexto('¡Cuenta creada!');
        await captura('SEL-01_cuenta_creada');
        await driver.wait(until.urlContains('/login'), ESPERA);
    });

    it('SEL-02 Login con contraseña incorrecta muestra un mensaje genérico', async () => {
        await iniciarSesion(PACIENTE.correo, 'Incorrecta2026');
        await esperarTexto('Correo o contraseña incorrectos');
        await captura('SEL-02_login_incorrecto');
        assert.ok((await driver.getCurrentUrl()).includes('/login'));
    });

    it('SEL-03 Login correcto entra al panel del paciente', async () => {
        await iniciarSesion(PACIENTE.correo, PACIENTE.contrasena);
        await driver.wait(until.urlContains('/paciente'), ESPERA);
        await captura('SEL-03_panel_paciente');
    });

    it('SEL-04 Reservar una cita de Medicina General', async () => {
        await driver.get(`${URL}/paciente/reservar`);
        await clic(By.xpath(`//button[contains(normalize-space(.), 'Medicina General')]`));
        await clic(By.xpath(`//button[contains(normalize-space(.), 'Carlos Lopez')]`));

        // Día con cupo, a 2 días o más (para poder reprogramarlo después)
        const hoy = new Date();
        const minimo = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 2);
        let dia = null;
        for (let intento = 0; intento < 2 && !dia; intento++) {
            await driver.sleep(800);
            const botones = await driver.findElements(By.xpath(`//button[contains(normalize-space(.), 'libres') and not(@disabled)]`));
            for (const b of botones) {
                const numero = Number((await b.getText()).trim().split(/\s+/)[0]);
                const mesOffset = intento; // 0 = mes actual, 1 = mes siguiente
                const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset, numero);
                if (fecha >= minimo) { dia = b; fechaCita = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(numero).padStart(2, '0')}`; break; }
            }
            if (!dia) await clic(boton('›'));
        }
        assert.ok(dia, 'No se encontró un día con cupo');
        await dia.click();
        await clic(boton('Continuar →'));

        // Primera hora libre
        await driver.sleep(1000);
        const horas = await driver.findElements(By.xpath(`//button[contains(., ' AM') or contains(., ' PM')][not(@disabled)]`));
        assert.ok(horas.length > 0, 'No hay horas libres');
        await horas[0].click();
        const motivo = await driver.findElement(By.css('textarea'));
        await motivo.sendKeys('Control general (prueba Selenium)');
        await captura('SEL-04a_antes_de_confirmar');
        await clic(boton('✓ Confirmar reserva'));
        await esperarTexto('¡Cita reservada!');
        await captura('SEL-04b_cita_reservada');
    });

    it('SEL-05 Reprogramar la cita a otro día', async () => {
        await driver.get(`${URL}/paciente/mis-citas`);
        await clic(boton('Reprogramar'));
        const dialogo = await driver.wait(until.elementLocated(By.css('[role=dialog]')), ESPERA);
        const inputFecha = await dialogo.findElement(By.css('input[type=date]'));

        // Busca el siguiente día con horas libres (salta domingos y días sin cupo)
        let hora = null;
        for (let d = 1; d <= 6 && !hora; d++) {
            await ponerFecha(inputFecha, isoMas(fechaCita, d));
            await driver.sleep(1200);
            const horas = await dialogo.findElements(By.css('fieldset button'));
            if (horas.length) hora = horas[0];
        }
        assert.ok(hora, 'No se encontró un día con horas libres para reprogramar');
        await hora.click();
        await captura('SEL-05a_ventana_reprogramar');
        await clic(boton('Confirmar cambio'));
        await esperarTexto('Cita reprogramada');
        await captura('SEL-05b_cita_reprogramada');
        await clic(boton('Entendido'));
    });

    it('SEL-06 Cancelar la cita', async () => {
        await clic(boton('Cancelar cita'));
        await clic(boton('Sí, cancelar'));
        await esperarTexto('Cita cancelada');
        await captura('SEL-06_cita_cancelada');
    });
});
