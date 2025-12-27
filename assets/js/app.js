/* ==============================
   Panera Signature · Control de Pasteles
   ============================== */

/*******************************
 * SEED Y CATÁLOGOS BÁSICOS
 *******************************/
const METODOS_DEFAULT_GASTOS = ["Efectivo", "Tarjeta", "Transferencia", "Cortesía"];
const METODOS_DEFAULT_VENTAS = ["Por definir", "Efectivo", "Transferencia", "Tarjeta"];
const GASTO_CATS = ["Ingredientes", "Empaques", "Nómina", "Renta", "Servicios", "Publicidad", "Transporte", "Mantenimiento", "Varios"];
const CANALES = ["Whatsapp", "Facebook", "Instagram", "Telefono"];
const ESTATUS_ENTREGA = ["Por preparar", "Listo", "En camino", "Entregado", "Cancelado"];
const DOW_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/* ==============================
   Tema (claro/oscuro) + Charts
   ============================== */
function getPreferredTheme() {
    try {
        const saved = localStorage.getItem('panera.theme');
        if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) { }
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
}
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function toRgba(hex, a) {
    const m = (hex || '').match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i); if (!m) return hex || '#000';
    const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16); return `rgba(${r},${g},${b},${a})`;
}
function chartPalette() {
    return [cssVar('--p-blue') || '#66B6CC', cssVar('--p-deep') || '#2B4E59', cssVar('--ok') || '#16a34a', cssVar('--warn') || '#f59e0b', cssVar('--err') || '#dc2626', '#8b5cf6'];
}
function themeCharts() {
    if (typeof Chart === 'undefined') return;
    const ink = cssVar('--ink') || '#111827';
    const grid = cssVar('--p-light') || '#e5e7eb';
    Chart.defaults.color = ink;
    Chart.defaults.borderColor = grid;
    Chart.defaults.font = { family: 'Montserrat,system-ui,Segoe UI,Roboto,Helvetica,Arial' };
}
function updateThemeToggleIcon() {
    const isDark = (document.documentElement.getAttribute('data-theme') || '') === 'dark';
    const sun = document.getElementById('icon-sun'); const moon = document.getElementById('icon-moon');
    if (sun && moon) { sun.style.display = isDark ? 'none' : 'inline-block'; moon.style.display = isDark ? 'inline-block' : 'none'; }
}
function setTheme(theme) {
    const t = (theme === 'dark') ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('panera.theme', t); } catch (e) { }
    themeCharts();
    updateThemeToggleIcon();
    refreshChartsForTheme();
}
function toggleTheme() {
    const curr = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
    setTheme(curr === 'dark' ? 'light' : 'dark');
}
window._charts = window._charts || [];
function refreshChartsForTheme() {
    if (typeof Chart === 'undefined') return;
    const pal = chartPalette();
    const grid = toRgba(cssVar('--p-light') || '#e5e7eb', .6);
    (window._charts || []).forEach(ch => {
        try {
            const type = ch.config.type;
            const ds = (ch.data && ch.data.datasets && ch.data.datasets[0]) ? ch.data.datasets[0] : null;
            if (type === 'line' && ds) {
                ds.borderColor = pal[0]; ds.backgroundColor = toRgba(pal[0], .15);
                if (ch.options?.scales?.y) { ch.options.scales.y.grid = ch.options.scales.y.grid || {}; ch.options.scales.y.grid.color = grid; }
                if (ch.options?.scales?.x) { ch.options.scales.x.grid = ch.options.scales.x.grid || {}; ch.options.scales.x.grid.display = false; }
            }
            if (type === 'bar' && ds) {
                ds.backgroundColor = pal[1];
                if (ch.options?.scales?.y) { ch.options.scales.y.grid = ch.options.scales.y.grid || {}; ch.options.scales.y.grid.color = grid; }
                if (ch.options?.scales?.x) { ch.options.scales.x.grid = ch.options.scales.x.grid || {}; ch.options.scales.x.grid.display = false; }
            }
            if (type === 'doughnut' && ds) { const len = (ds.data || []).length; ds.backgroundColor = Array.from({ length: len }, (_, i) => pal[i % pal.length]); }
            ch.update('none');
        } catch (e) { }
    });
}
function fillSelectFiltro(id_, arr, labelAll = "(todos)") {
    const s = document.getElementById(id_);
    if (!s) return;
    s.innerHTML = `<option value="">${labelAll}</option>` + (arr || []).map(x => `<option>${x}</option>`).join("");
}

function getMetodosVentas() { return (DB.config && Array.isArray(DB.config.metodosVentas) ? DB.config.metodosVentas : METODOS_DEFAULT_VENTAS).slice(); }
function getMetodosGastos() { return (DB.config && Array.isArray(DB.config.metodosGastos) ? DB.config.metodosGastos : METODOS_DEFAULT_GASTOS).slice(); }

/*******************************
 * BASE DE DATOS LOCAL (CACHE)
 *******************************/
const DB = {
    config: { prefijo: "PAN", seriePorDia: true },
    clientes: [],
    proveedores: [],
    productos: [],
    ventas: [],
    gastos: [],
    eventos: [],
    costeo: { materiales: [], recetas: [] }
};

async function loadDataFromAPI() {
    try {
        const [sales, clients, products] = await Promise.all([
            api.getSales(),
            api.getClients(),
            api.getProducts()
        ]);

        DB.ventas = sales || [];
        DB.clientes = clients || [];

        // Transform products from DB format to Frontend format if needed
        // Backend: {id, categoria, producto, variantes: JSON, activo}
        // Frontend expects same structure, so it should be fine.
        DB.productos = products || [];

        // Config defaults
        if (!DB.config) DB.config = { prefijo: "PAN" };
        if (!DB.config.nombreNegocio) DB.config.nombreNegocio = 'Panera Signature';

        console.log("Data loaded from API");
        initUI(); // Re-init UI with data
    } catch (e) {
        console.error("Error loading data", e);
        toast("Error cargando datos del servidor", "err");
    }
}

// Stub for saveDB - in API version we save individual entities
function saveDB() {
    console.warn("saveDB called but we are using API now. Ensure specific API calls are made.");
}

/*******************************
 * UTILIDADES
 *******************************/
const fmt = n => (Number(n || 0)).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const pad2 = n => String(n).padStart(2, '0');
const ymd = (d) => { const dt = d ? new Date(d) : new Date(); return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`; };
const hoyISO = () => ymd(new Date());
const nowLocalDateTime = () => { const dt = new Date(); return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`; };
const fmtLocal = (d) => { try { const dt = new Date(d); return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`; } catch (e) { return String(d).replace('T', ' ').slice(0, 16); } };
const id = () => Math.random().toString(36).slice(2, 10);
const sum = (arr, sel) => arr.reduce((a, x) => a + (sel ? sel(x) : x), 0);

function nextFolio() {
    // In API version, backend should handle folio or we fetch latest.
    // For now, simple random or increment based on local cache length + 1
    const pf = DB.config.prefijo || "PAN";
    const n = DB.ventas.length + 1;
    return `${pf}-${String(n).padStart(4, "0")}`;
}

// Toast visual simple (success/warn/error)
function toast(msg, kind = "ok", timeout = 2400) {
    try {
        let root = document.querySelector('.toast-wrap');
        if (!root) { root = document.createElement('div'); root.className = 'toast-wrap'; document.body.appendChild(root); }
        const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = msg;
        root.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; el.style.transition = 'all .2s ease'; }, timeout - 200);
        setTimeout(() => { el.remove(); }, timeout);
    } catch (e) { console.log(msg); }
}

function getSelectEstatus() {
    return document.getElementById("v-estatus-pago-top") || document.getElementById("v-estatus-pago");
}
function syncEstatusSelects(src) {
    const top = document.getElementById("v-estatus-pago-top");
    const bottom = document.getElementById("v-estatus-pago");
    if (!src) return;
    const val = src.value;
    if (top && src !== top) top.value = val || "";
    if (bottom && src !== bottom) bottom.value = val || "";
    if (val === 'pagado') {
        const sub = sum(VENTA.items, it => it.precio * it.cant);
        const desc = Number(document.getElementById("t-descuento").value || 0);
        const total = Math.max(0, sub - desc);
        const pagado = sum(VENTA.pagos, p => p.monto);
        const saldo = Math.max(0, total - pagado);
        if (saldo > 0) {
            const inp = document.getElementById('pago-monto');
            if (inp) { inp.value = saldo; inp.focus(); }
            toast('Se llenó el monto con el saldo pendiente.', 'warn');
        }
    }
    recalc();
}

/*******************************
 * INICIALIZACIÓN DE UI
 *******************************/
function initUI() {
    // Tabs
    document.querySelectorAll("nav button").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            localStorage.setItem("panera.activeTab", btn.dataset.tab);
            document.querySelectorAll("section.tab").forEach(s => s.classList.add("hidden"));
            document.getElementById(btn.dataset.tab).classList.remove("hidden");
            if (btn.dataset.tab === "tab-dashboard") renderDashboard();
            // if(btn.dataset.tab==="tab-calendario"){ renderCalendario(); renderEventos(); }
            // if(btn.dataset.tab==="tab-cotizador"){ renderMateriales(); renderRecetasList(); renderSelectMateriales(); recalcReceta(); }
        };
    });

    fillSelect("pago-metodo", getMetodosVentas());
    fillSelect("v-metodo-pago-top", getMetodosVentas());
    fillSelect("g-metodo", getMetodosGastos());
    fillSelect("g-cat", GASTO_CATS);

    fillSelectFiltro("f-canal", CANALES);
    fillSelectFiltro("f-envio", ["A domicilio", "Recogen en Better", "Recogen en Lomas", "Recogen en Atzala"]);
    fillSelectFiltro("f-estatus", ["Pagado", "Por Cobrar"]);
    fillSelectFiltro("f-mp", getMetodosVentas());
    fillSelectFiltro("f-entrega", ESTATUS_ENTREGA);

    fillSelectFiltro("fg-cat", GASTO_CATS);
    fillSelectFiltro("fg-metodo", getMetodosGastos());

    renderCategorias();
    renderProductos();
    renderVariantes();
    syncPrecio();

    renderClientesDatalist();
    renderProveedoresDatalist();

    renderVentasRecientes();
    renderClientes();
    renderTablaProductos();
    // renderGastos();
    renderDashboard();
    // renderMateriales(); renderRecetasList(); renderSelectMateriales();
    // renderCalendario();
    // renderEventos();

    rebuildProductIndex();

    document.getElementById("g-fecha").value = hoyISO();
    const fb = document.getElementById('footer-brand'); if (fb) fb.textContent = DB.config.nombreNegocio || 'Panera Signature';

    const fv = document.getElementById("v-fecha-venta");
    if (fv && !fv.value) {
        const now = new Date(); const pad = n => String(n).padStart(2, "0");
        fv.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }

    espejoEnvioEnEntrega();
    document.getElementById("envio-metodo")?.addEventListener("change", espejoEnvioEnEntrega);
    document.getElementById("v-estatus-pago-top")?.addEventListener("change", (e) => syncEstatusSelects(e.target));
    document.getElementById("v-estatus-pago")?.addEventListener("change", (e) => syncEstatusSelects(e.target));
    document.getElementById("v-metodo-pago-top")?.addEventListener("change", (e) => {
        const val = e.target.value; const pm = document.getElementById("pago-metodo"); if (pm) { pm.value = val; }
    });
    document.getElementById("v-estatus-entrega-top")?.addEventListener("change", (e) => {
        const v = e.target.value || "Por preparar";
        const tag = document.getElementById("estatus-entrega");
        if (tag) tag.textContent = v;
    });

    document.getElementById("p-cant")?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } });

    const savedTab = localStorage.getItem("panera.activeTab");
    if (savedTab) {
        const btn = document.querySelector(`nav button[data-tab="${savedTab}"]`);
        if (btn) { btn.click(); }
    }

    const cliInp = document.getElementById('v-cliente');
    cliInp?.addEventListener('input', renderSugerenciasCliente);
    cliInp?.addEventListener('focus', renderSugerenciasCliente);
    cliInp?.addEventListener('blur', () => setTimeout(() => document.getElementById('v-cliente-suggest')?.classList.add('hidden'), 150));

    const pr = document.getElementById('p-buscar-rapido');
    pr?.addEventListener('input', renderSugerenciasProducto);
    pr?.addEventListener('focus', renderSugerenciasProducto);
    pr?.addEventListener('blur', () => setTimeout(() => document.getElementById('p-suggest')?.classList.add('hidden'), 150));
    pr?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addItemDesdeBusqueda(); } });
}

function fillSelect(id_, arr) {
    const s = document.getElementById(id_);
    if (!s) return;
    const needsPH = s.hasAttribute('required');
    const ph = s.dataset.placeholder || '— Selecciona —';
    s.innerHTML = needsPH ? `<option value="" disabled selected>${ph}</option>` : '';
    s.innerHTML += (arr || []).map(x => `<option>${x}</option>`).join("");
}

function espejoEnvioEnEntrega() {
    const sel = document.getElementById("envio-metodo");
    const inputDisabled = document.querySelector('#tab-ventas input[disabled]');
    if (sel && inputDisabled) { inputDisabled.value = sel.value || "(selecciona arriba)"; }
}


/*******************************
 * PRODUCTOS
 *******************************/
function categoriasUnicas() { return [...new Set(DB.productos.map(p => p.categoria))]; }
function renderCategorias() {
    const cats = categoriasUnicas();
    fillSelect("p-cat", cats);
    fillSelect("fpcat", ["(todas)", ...cats]);
}
function renderProductos() {
    const cat = document.getElementById("p-cat").value;
    let prods = [];
    if (cat) {
        prods = DB.productos.filter(p => p.categoria === cat && p.activo !== false).map(p => p.producto);
    }
    fillSelect("p-prod", prods);
    renderVariantes();
}
function renderVariantes() {
    const prodName = document.getElementById("p-prod").value;
    const prod = DB.productos.find(p => p.producto === prodName);
    const vars = prod ? Object.keys(prod.variantes) : [];
    fillSelect("p-var", vars);
    syncPrecio();
}
function syncPrecio() {
    const prod = DB.productos.find(p => p.producto === document.getElementById("p-prod").value);
    const talla = document.getElementById("p-var").value;
    const precio = prod?.variantes?.[talla] ?? 0;
    document.getElementById("p-precio").value = precio;
}

function renderTablaProductos() {
    const cat = document.getElementById("fpcat").value;
    const q = (document.getElementById("fpq").value || "").toLowerCase();
    const act = document.getElementById("fpact").value;
    const tb = document.querySelector("#tabla-productos tbody");
    let rows = [];
    DB.productos.forEach(p => {
        if (cat !== "(todas)" && p.categoria !== cat) return;
        if (act === "activos" && p.activo === false) return;
        if (act === "inactivos" && p.activo !== false) return;
        Object.entries(p.variantes || {}).forEach(([nombre, precio]) => {
            const text = `${p.producto} ${nombre}`.toLowerCase();
            if (q && !text.includes(q)) return;
            rows.push(`<tr>
        <td>${p.producto}</td>
        <td>${nombre}</td>
        <td class="right">${fmt(precio)}</td>
        <td>
          <label><input type="checkbox" ${p.activo !== false ? "checked" : ""} onchange="toggleProductoActivo('${p.id}', this.checked)"> Activo</label>
        </td>
      </tr>`);
        });
    });
    tb.innerHTML = rows.join("") || `<tr><td colspan="4" class="muted">Sin resultados</td></tr>`;
}
async function toggleProductoActivo(prodId, checked) {
    const p = DB.productos.find(x => x.id == prodId); // Loose equality for string/int
    if (p) {
        p.activo = !!checked;
        try {
            await api.saveProduct(p);
            rebuildProductIndex();
            toast("Producto actualizado");
        } catch (e) {
            console.error(e);
            toast("Error actualizando producto", "err");
        }
    }
}

/*******************************
 * CLIENTES
 *******************************/
async function upsertClientePorNombre(nombre) {
    const nm = (nombre || "").trim();
    if (!nm) return { id: "MOSTRADOR", nombre: "Mostrador" };
    let c = DB.clientes.find(x => x.nombre.toLowerCase() === nm.toLowerCase());
    if (!c) {
        c = { id: id(), nombre: nm, telefono: "", direccion: "", notas: "", creadoEn: new Date().toISOString() };
        try {
            await api.saveClient(c);
            DB.clientes.push(c);
            renderClientesDatalist();
        } catch (e) {
            console.error(e);
            toast("Error creando cliente", "err");
        }
    }
    return c;
}
async function agregarClienteRapido() {
    const nm = (document.getElementById("v-cliente").value || "").trim();
    if (!nm) { alert("Escribe el nombre del cliente."); return; }
    await upsertClientePorNombre(nm);
    toast("Cliente guardado");
    renderClientes();
}
function renderClientesDatalist() {
    const dl = document.getElementById("dl-clientes");
    dl.innerHTML = DB.clientes.map(c => `<option value="${c.nombre}">`).join("");
}

/* =====================
   AUTOCOMPLETE CLIENTE
   ===================== */
function buscarCoincidenciasCliente(q) {
    const term = (q || "").trim().toLowerCase();
    if (!term) return [];
    return DB.clientes.filter(c => {
        const nom = (c.nombre || "").toLowerCase();
        const tel = String(c.telefono || "");
        const dir = (c.direccion || "").toLowerCase();
        const last4 = tel.slice(-4);
        return nom.includes(term) || dir.includes(term) || tel.includes(term) || (term.length >= 3 && last4 === term);
    }).slice(0, 20);
}
function renderSugerenciasCliente() {
    const el = document.getElementById('v-cliente');
    const box = document.getElementById('v-cliente-suggest');
    if (!el || !box) return;
    const q = el.value;
    const arr = buscarCoincidenciasCliente(q);
    if (arr.length === 0) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    box.innerHTML = arr.map(c => `
    <div class="ac-item" data-id="${c.id}" onclick="selectClienteDesdeAC('${c.id}')">
      <div class="ac-name">${c.nombre}</div>
      <div class="ac-meta">${c.telefono || ''}<br>${(c.direccion || '').slice(0, 48)}</div>
    </div>`).join('');
    box.classList.remove('hidden');
}
function selectClienteDesdeAC(cid) {
    const c = DB.clientes.find(x => x.id == cid);
    const inp = document.getElementById('v-cliente');
    if (!c || !inp) return;
    inp.value = c.nombre;
    inp.dataset.cid = c.id;
    const dir = document.getElementById('entrega-dir');
    if (dir && c.direccion) { dir.value = c.direccion; }
    document.getElementById('v-cliente-suggest')?.classList.add('hidden');
}

function renderClientes() {
    const buscar = (document.getElementById("c-buscar")?.value || "").toLowerCase();
    const orden = document.getElementById("c-orden")?.value || "nombre";
    const stats = {};
    DB.ventas.forEach(v => {
        const key = v.clienteNombre || "Mostrador";
        if (!stats[key]) stats[key] = { total: 0, ultima: "", count: 0 };
        stats[key].total += v.total;
        stats[key].count += 1;
        if (!stats[key].ultima || v.fecha > stats[key].ultima) stats[key].ultima = v.fecha;
    });
    const rows = DB.clientes
        .filter(c => {
            if (!buscar) return true;
            const nom = (c.nombre || "").toLowerCase();
            const tel = String(c.telefono || "").toLowerCase();
            const dir = (c.direccion || "").toLowerCase();
            return nom.includes(buscar) || tel.includes(buscar) || dir.includes(buscar);
        })
        .map(c => ({ c, s: stats[c.nombre] || { total: 0, ultima: "", count: 0 } }))
        .sort((a, b) => {
            if (orden === "nombre") return a.c.nombre.localeCompare(b.c.nombre);
            if (orden === "total") return b.s.total - a.s.total;
            if (orden === "ultima") return (b.s.ultima || "").localeCompare(a.s.ultima || "");
            return 0;
        })
        .map(({ c, s }) => `<tr>
      <td>${c.nombre}</td>
      <td>${c.telefono || ""}</td>
      <td>${c.direccion || ""}</td>
      <td class="right">${fmt(s.total)}</td>
      <td>${s.ultima ? s.ultima.slice(0, 10) : ""}</td>
      <td>
        <button class="btn alt" onclick="editarCliente('${c.id}')">Editar</button>
        <!-- <button class="btn ghost" onclick="eliminarCliente('${c.id}')">Eliminar</button> -->
      </td>
    </tr>`);
    document.querySelector("#tabla-clientes tbody").innerHTML = rows.join("") || `<tr><td colspan="6" class="muted">Sin clientes</td></tr>`;
}
async function guardarCliente() {
    const nombre = document.getElementById("c-nombre").value.trim();
    if (!nombre) { alert("Nombre requerido"); return; }
    const tel = document.getElementById("c-tel").value.trim();
    const dir = document.getElementById("c-dir").value.trim();
    const notas = document.getElementById("c-notas").value.trim();

    let c = DB.clientes.find(x => x.nombre.toLowerCase() === nombre.toLowerCase());
    if (!c) {
        c = DB.clientes.find(x => (x.telefono || "") === tel && (x.direccion || "") === dir);
    }
    if (!c) { c = { id: id(), creadoEn: new Date().toISOString() }; DB.clientes.push(c); }
    c.nombre = nombre; c.telefono = tel; c.direccion = dir; c.notas = notas;

    try {
        await api.saveClient(c);
        renderClientesDatalist(); renderClientes();
        toast("Cliente guardado");
    } catch (e) {
        console.error(e);
        toast("Error guardando cliente", "err");
    }
}
function limpiarCliente() { ["c-nombre", "c-tel", "c-dir", "c-notas"].forEach(id => document.getElementById(id).value = ""); }
function editarCliente(cid) {
    const c = DB.clientes.find(x => x.id == cid);
    if (!c) return;
    document.querySelector('[data-tab="tab-clientes"]').click();
    document.getElementById("c-nombre").value = c.nombre || "";
    document.getElementById("c-tel").value = c.telefono || "";
    document.getElementById("c-dir").value = c.direccion || "";
    document.getElementById("c-notas").value = c.notas || "";
}

// ==============================
// BÚSQUEDA RÁPIDA DE PRODUCTOS
// ==============================
let PRODUCT_INDEX = [];
function rebuildProductIndex() {
    PRODUCT_INDEX = [];
    DB.productos.filter(p => p.activo !== false).forEach(p => {
        Object.entries(p.variantes || {}).forEach(([v, precio]) => {
            PRODUCT_INDEX.push({ cat: p.categoria, prod: p.producto, var: v, precio, key: `${p.producto} ${v}`.toLowerCase() });
        });
    });
}
function buscarProductoRapido(q) {
    const term = (q || '').trim().toLowerCase(); if (!term) return [];
    const toks = term.split(/\s+/).filter(Boolean);
    const scored = PRODUCT_INDEX.map(it => {
        const score = toks.reduce((s, t) => s + (it.key.includes(t) ? 1 : 0), 0);
        return { it, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 10).map(x => x.it);
    return scored;
}
function renderSugerenciasProducto() {
    const box = document.getElementById('p-suggest'); const inp = document.getElementById('p-buscar-rapido'); if (!box || !inp) return;
    const arr = buscarProductoRapido(inp.value);
    if (arr.length === 0) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    box.innerHTML = arr.map(r => `<div class="ac-item" onclick="selectProductoSugerencia('${r.cat}','${r.prod}','${r.var}')">
    <div class="ac-name">${r.prod} <span class="badge">${r.var}</span></div>
    <div class="ac-meta">${r.cat}<br>${fmt(r.precio)}</div>
  </div>`).join('');
    box.classList.remove('hidden');
}
function selectProductoSugerencia(cat, prod, vari) {
    const c = document.getElementById('p-cat'); if (c) { c.value = cat; renderProductos(); }
    const p = document.getElementById('p-prod'); if (p) { p.value = prod; renderVariantes(); }
    const v = document.getElementById('p-var'); if (v) { v.value = vari; syncPrecio(); }
    document.getElementById('p-suggest')?.classList.add('hidden');
    const qty = document.getElementById('p-cant'); if (qty) qty.focus();
}
function addItemDesdeBusqueda() {
    const arr = buscarProductoRapido(document.getElementById('p-buscar-rapido').value);
    if (arr.length > 0) { selectProductoSugerencia(arr[0].cat, arr[0].prod, arr[0].var); addItem(); }
}


/*******************************
 * VENTAS
 *******************************/
const VENTA = { items: [], pagos: [] };
let editingGastoId = null;
let editingVentaId = null;

function addItem() {
    const prod = document.getElementById("p-prod").value;
    const talla = document.getElementById("p-var").value;
    const precio = Number(document.getElementById("p-precio").value || 0);
    const cant = Number(document.getElementById("p-cant").value || 1);
    if (!prod || !talla || precio <= 0 || cant <= 0) { alert("Completa producto, talla, precio y cantidad."); return; }
    VENTA.items.push({ id: id(), prod, talla, precio, cant });
    renderItems(); recalc();
}
function removeItem(i) { VENTA.items.splice(i, 1); renderItems(); recalc(); }
function renderItems() {
    const tb = document.querySelector("#tabla-items tbody");
    tb.innerHTML = VENTA.items.map((it, idx) => `
    <tr>
      <td>${it.prod}</td>
      <td>${it.talla}</td>
      <td class="right">${fmt(it.precio)}</td>
      <td class="right">${it.cant}</td>
      <td class="right">${fmt(it.precio * it.cant)}</td>
      <td class="right"><button class="btn ghost" onclick="removeItem(${idx})">Quitar</button></td>
    </tr>`).join("");
}

function recalc() {
    const sub = sum(VENTA.items, it => it.precio * it.cant);
    const desc = Number(document.getElementById("t-descuento").value || 0);
    const total = Math.max(0, sub - desc);

    document.getElementById("t-subtotal").textContent = fmt(sub);
    document.getElementById("t-total").textContent = fmt(total);

    const pagado = sum(VENTA.pagos, p => p.monto);
    const saldo = Math.max(0, total - pagado);
    document.getElementById("pagado").textContent = fmt(pagado);
    document.getElementById("saldo").textContent = fmt(saldo);

    // Mostrar estatus calculado para claridad visual
    const estadoCalc = (total > 0 && saldo <= 0) ? 'Pagado' : 'Por Cobrar';
    document.getElementById("estatus-pago").textContent = estadoCalc;
}

function addPago() {
    const metodo = document.getElementById("pago-metodo").value;
    const monto = Number(document.getElementById("pago-monto").value || 0);
    if (monto <= 0) { alert("Monto inválido"); return; }
    VENTA.pagos.push({ fecha: new Date().toISOString(), metodo, monto });
    renderPagos(); recalc();
    document.getElementById("pago-monto").value = "";
}
function removePago(i) { VENTA.pagos.splice(i, 1); renderPagos(); recalc(); }
function renderPagos() {
    const tb = document.querySelector("#tabla-pagos tbody");
    tb.innerHTML = VENTA.pagos.map((p, idx) => `
    <tr>
      <td>${p.fecha.slice(0, 16).replace("T", " ")}</td>
      <td>${p.metodo}</td>
      <td class="right">${fmt(p.monto)}</td>
      <td class="right"><button class="btn ghost" onclick="removePago(${idx})">Quitar</button></td>
    </tr>`).join("");
}

function editarVenta(ventaId) {
    const v = DB.ventas.find(x => x.id == ventaId);
    if (!v) return;
    editingVentaId = v.id;
    document.querySelector('[data-tab="tab-ventas"]').click();

    document.getElementById("v-cliente").value = v.clienteNombre || "";
    document.getElementById("v-canal").value = v.canal || "";

    VENTA.items = JSON.parse(JSON.stringify(v.items || []));
    VENTA.pagos = JSON.parse(JSON.stringify(v.pagos || []));
    renderItems(); renderPagos();

    document.getElementById("t-descuento").value = Number(v.descuento || 0);
    const metodo = v.envioMetodo || v?.entrega?.metodo || (v?.entrega?.tipo || "");
    if (document.getElementById("envio-metodo") && metodo) { document.getElementById("envio-metodo").value = metodo; }
    if (document.getElementById("entrega-fecha")) document.getElementById("entrega-fecha").value = v?.entrega?.fecha || "";
    if (document.getElementById("entrega-dir")) document.getElementById("entrega-dir").value = v?.entrega?.dir || "";
    espejoEnvioEnEntrega();

    const est = (v.estatusPago || "Por Cobrar").toLowerCase() === "pagado" ? "pagado" : "por_cobrar";
    const topSel = document.getElementById("v-estatus-pago-top");
    const botSel = document.getElementById("v-estatus-pago");
    if (topSel) topSel.value = est;
    if (botSel) botSel.value = est;
    document.getElementById("estatus-pago").textContent = (est === "pagado" ? "Pagado" : "Por Cobrar");

    const estEnt = v.estatusEntrega || "Por preparar";
    const selEntTop = document.getElementById("v-estatus-entrega-top");
    if (selEntTop) selEntTop.value = estEnt;
    const tagEnt = document.getElementById("estatus-entrega");
    if (tagEnt) tagEnt.textContent = estEnt;

    const fv = document.getElementById("v-fecha-venta");
    if (fv) {
        const d = v.fecha ? new Date(v.fecha) : new Date(); const pad = n => String(n).padStart(2, "0");
        fv.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    const mpTop = document.getElementById("v-metodo-pago-top");
    if (mpTop) {
        const arr = getMetodosVentas();
        mpTop.value = (v.pagos && v.pagos[0] ? v.pagos[0].metodo : (arr[0] || ''));
    }

    recalc();
}

async function guardarVenta() {
    if (VENTA.items.length === 0) { alert("Agrega al menos un producto"); return; }
    const clienteNombre = (document.getElementById("v-cliente").value || "Mostrador").trim();
    const cliente = await upsertClientePorNombre(clienteNombre);

    const fechaVentaInput = document.getElementById("v-fecha-venta")?.value || "";
    const fechaISO = fechaVentaInput ? fechaVentaInput : nowLocalDateTime();

    const canal = document.getElementById("v-canal").value;
    const notas = document.getElementById("v-notas").value;
    const envioMetodo = document.getElementById("envio-metodo").value;
    if (!envioMetodo) { alert("Selecciona el método de envío."); document.getElementById("envio-metodo").focus(); return; }
    if (!canal) { alert("Selecciona el Canal."); document.getElementById("v-canal").focus(); return; }
    const metodoTopSel = document.getElementById("v-metodo-pago-top");
    if (!metodoTopSel.value) { alert("Selecciona el Método de pago."); metodoTopSel.focus(); return; }

    const selEstatus = getSelectEstatus();
    if (!selEstatus || !selEstatus.value) { alert("Selecciona el Status de pago."); selEstatus && selEstatus.focus(); return; }

    const entrega = { metodo: envioMetodo, fecha: document.getElementById("entrega-fecha").value, dir: document.getElementById("entrega-dir").value };

    const sub = sum(VENTA.items, it => it.precio * it.cant);
    const desc = Number(document.getElementById("t-descuento").value || 0);
    const total = Math.max(0, sub - desc);

    const metodoPagoTop = document.getElementById("v-metodo-pago-top")?.value || document.getElementById("pago-metodo")?.value || (getMetodosVentas()[0] || "Efectivo");

    const estatusSel = selEstatus.value;
    let pagadoPrevio = sum(VENTA.pagos, p => p.monto);
    if (estatusSel === "pagado" && pagadoPrevio < total) {
        VENTA.pagos.push({ fecha: fechaISO, metodo: metodoPagoTop, monto: Math.max(0, total - pagadoPrevio) });
    }
    const pagado = sum(VENTA.pagos, p => p.monto);
    const saldo = Math.max(0, total - pagado);

    const estatusEntregaSel = (document.getElementById("v-estatus-entrega-top")?.value || "Por preparar");

    let ventaObj = {};
    if (editingVentaId) {
        const idx = DB.ventas.findIndex(x => x.id == editingVentaId);
        if (idx > -1) {
            const original = DB.ventas[idx];
            ventaObj = {
                ...original,
                fecha: fechaISO,
                clienteId: cliente.id, clienteNombre: cliente.nombre,
                canal,
                subtotal: sub, descuento: desc, total, saldo,
                estatusPago: estatusSel === "pagado" ? "Pagado" : (saldo <= 0 ? "Pagado" : "Por Cobrar"),
                estatusEntrega: estatusEntregaSel,
                notas,
                entrega,
                envioMetodo,
                items: VENTA.items,
                pagos: VENTA.pagos
            };
        }
    } else {
        ventaObj = {
            id: id(),
            folio: nextFolio(),
            fecha: fechaISO,
            clienteId: cliente.id, clienteNombre: cliente.nombre,
            canal, subtotal: sub, descuento: desc, total, saldo,
            estatusPago: estatusSel === "pagado" ? "Pagado" : (saldo <= 0 ? "Pagado" : "Por Cobrar"),
            estatusEntrega: estatusEntregaSel,
            notas,
            entrega, envioMetodo,
            items: VENTA.items, pagos: VENTA.pagos
        };
    }

    try {
        await api.saveSale(ventaObj);
        toast("Venta guardada: " + ventaObj.folio);
        // Refresh data
        await loadDataFromAPI();
        nuevaVenta();
        renderVentasRecientes();
        renderDashboard();
    } catch (e) {
        console.error(e);
        toast("Error guardando venta", "err");
    }
}

function nuevaVenta() {
    editingVentaId = null;
    VENTA.items = []; VENTA.pagos = [];
    renderItems(); renderPagos();
    document.getElementById("t-descuento").value = 0;
    ["v-notas", "entrega-dir"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("entrega-fecha").value = "";
    document.getElementById("v-cliente").value = "";
    const topSel = document.getElementById("v-estatus-pago-top");
    const botSel = document.getElementById("v-estatus-pago");
    if (topSel) topSel.value = "";
    if (botSel) botSel.value = "";
    document.getElementById("estatus-pago").textContent = "Por Cobrar";
    const fv = document.getElementById("v-fecha-venta");
    if (fv) {
        const now = new Date(); const pad = n => String(n).padStart(2, "0");
        fv.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }
    const mpTop = document.getElementById("v-metodo-pago-top");
    if (mpTop) { mpTop.value = ""; }

    const selEntTop = document.getElementById("v-estatus-entrega-top");
    if (selEntTop) selEntTop.value = "";
    const tagEnt = document.getElementById("estatus-entrega");
    if (tagEnt) tagEnt.textContent = "Por preparar";

    recalc();
}

function duplicarVenta(ventaId) {
    const v = DB.ventas.find(x => x.id == ventaId);
    if (!v) return;
    VENTA.items = JSON.parse(JSON.stringify(v.items || []));
    VENTA.pagos = [];
    renderItems(); renderPagos();
    document.querySelector('[data-tab="tab-ventas"]').click();
    document.getElementById('v-cliente').value = v.clienteNombre || '';
    document.getElementById('v-canal').value = v.canal || '';
    document.getElementById('envio-metodo').value = v.envioMetodo || '';
    espejoEnvioEnEntrega();
    document.getElementById('t-descuento').value = Number(v.descuento || 0);
    const topSel = document.getElementById('v-estatus-pago-top'); if (topSel) topSel.value = 'por_cobrar';
    const botSel = document.getElementById('v-estatus-pago'); if (botSel) botSel.value = 'por_cobrar';
    const mpTop = document.getElementById('v-metodo-pago-top'); if (mpTop) mpTop.value = '';
    recalc();
    toast('Venta duplicada, lista para guardar con nuevo folio.');
}

function whatsappShare() {
    const sub = sum(VENTA.items, it => it.precio * it.cant);
    const desc = Number(document.getElementById("t-descuento").value || 0);
    const total = Math.max(0, sub - desc);
    const lineas = VENTA.items.map(it => `• ${it.cant}× ${it.prod} ${it.talla} = ${fmt(it.precio * it.cant)}`).join("%0A");
    const brand = encodeURIComponent(DB.config?.nombreNegocio || 'Panera Signature');
    const txt = `${brand}%0A${lineas}%0A—%0ASubtotal: ${fmt(sub)}%0ADescuento: ${fmt(desc)}%0ATotal: ${fmt(total)}`;
    window.open(`https://wa.me/?text=${txt}`, "_blank");
}

function imprimirTicket() {
    const w = window.open("", "_blank", "width=380,height=600");
    const brand = (DB.config && DB.config.nombreNegocio) ? DB.config.nombreNegocio : 'Panera Signature';
    const sub = sum(VENTA.items, it => it.precio * it.cant);
    const desc = Number(document.getElementById("t-descuento").value || 0);
    const total = Math.max(0, sub - desc);
    const pagado = sum(VENTA.pagos, p => p.monto);
    const saldo = Math.max(0, total - pagado);
    const rows = VENTA.items.map(it => `<tr><td>${it.cant}× ${it.prod} ${it.talla}</td><td class="right">${fmt(it.precio * it.cant)}</td></tr>`).join("");
    w.document.write(`
    <style>body{font-family:monospace;padding:10px} table{width:100%} td{padding:4px 0} .right{text-align:right}</style>
    <h3>${brand}</h3>
    <small>${new Date().toLocaleString()}</small>
    <table>${rows}</table>
    <hr>
    <table>
      <tr><td>Subtotal</td><td class="right">${fmt(sub)}</td></tr>
      <tr><td>Descuento</td><td class="right">${fmt(desc)}</td></tr>
      <tr><td><b>Total</b></td><td class="right"><b>${fmt(total)}</b></td></tr>
      <tr><td>Pagado</td><td class="right">${fmt(pagado)}</td></tr>
      <tr><td>Saldo</td><td class="right">${fmt(saldo)}</td></tr>
    </table>
    <p style="text-align:center">Gracias por su compra</p>
  `);
    w.print();
}

/*******************************
 * LISTADO Y FILTROS DE VENTAS
 *******************************/
function renderVentasRecientes() {
    const desde = document.getElementById("f-desde").value;
    const hasta = document.getElementById("f-hasta").value;
    const cliente = (document.getElementById("f-cliente").value || "").toLowerCase();
    const clienteDigits = (document.getElementById("f-cliente").value || "").replace(/\D/g, "");
    const fCanal = document.getElementById("f-canal")?.value || "";
    const fEnvio = document.getElementById("f-envio")?.value || "";
    const fEst = document.getElementById("f-estatus")?.value || "";
    const fMP = document.getElementById("f-mp")?.value || "";
    const fEnt = document.getElementById("f-entrega")?.value || "";
    const tb = document.querySelector("#tabla-ventas tbody");
    let arr = DB.ventas.slice();
    if (desde) arr = arr.filter(v => ymd(v.fecha) >= desde);
    if (hasta) arr = arr.filter(v => ymd(v.fecha) <= hasta);
    if (cliente) {
        const mapCli = new Map(DB.clientes.map(c => [c.id, c]));
        arr = arr.filter(v => {
            const nameOk = (v.clienteNombre || "").toLowerCase().includes(cliente);
            const tel = String(mapCli.get(v.clienteId || "")?.telefono || "").replace(/\D/g, "");
            const telOk = clienteDigits ? tel.includes(clienteDigits) : false;
            return nameOk || telOk;
        });
    }
    if (fCanal) arr = arr.filter(v => (v.canal || "") === fCanal);
    if (fEnvio) arr = arr.filter(v => (v.envioMetodo || "") === fEnvio);
    if (fEst) arr = arr.filter(v => (v.estatusPago || "") === fEst);
    if (fMP) arr = arr.filter(v => (v.pagos || []).some(p => p.metodo === fMP));
    if (fEnt) arr = arr.filter(v => (v.estatusEntrega || "") === fEnt);
    const rows = arr.map(v => {
        const mpSet = new Set((v.pagos || []).map(p => p.metodo));
        const mpTxt = mpSet.size === 0 ? "—" : (mpSet.size > 1 ? "Mixto" : [...mpSet][0]);
        return `<tr>
      <td>${v.folio}</td>
      <td>${fmtLocal(v.fecha)}</td>
      <td>${v.clienteNombre || "Mostrador"}</td>
      <td>${v.canal || "—"}</td>
      <td>${v.envioMetodo || "—"}</td>
      <td>${v.estatusPago || "—"}</td>
      <td>${mpTxt}</td>
      <td class="right">${fmt(v.total)}</td>
      <td class="right">${fmt(v.saldo)}</td>
      <td>${v.estatusEntrega || "—"}</td>
      <td>
        <button class="btn alt" onclick="editarVenta('${v.id}')">Editar</button>
        <button class="btn primary" onclick="duplicarVenta('${v.id}')">Duplicar</button>
        <button class="btn ghost" onclick="eliminarVenta('${v.id}')">Eliminar</button>
      </td>
    </tr>`;
    });
    tb.innerHTML = rows.join("") || `<tr><td colspan="12" class="muted">Sin ventas</td></tr>`;
}

async function eliminarVenta(ventaId) {
    const v = DB.ventas.find(x => x.id == ventaId);
    if (!v) return;
    if (!confirm(`¿Eliminar la venta ${v.folio}? Esta acción no se puede deshacer.`)) return;

    try {
        await api.deleteSale(ventaId);
        await loadDataFromAPI();
        renderVentasRecientes();
        renderDashboard();
        toast("Venta eliminada: " + v.folio);
    } catch (e) {
        console.error(e);
        toast("Error eliminando venta", "err");
    }
}

/*******************************
 * DASHBOARD
 *******************************/
function renderDashboard() {
    const dDesde = document.getElementById("db-desde")?.value || null;
    const dHasta = document.getElementById("db-hasta")?.value || null;
    const startOfMonth = (() => { const d = new Date(); d.setDate(1); return ymd(d); })();
    const endToday = hoyISO();
    const rDesde = dDesde || startOfMonth;
    const rHasta = dHasta || endToday;
    const inRange = (iso) => (!rDesde || ymd(iso) >= rDesde) && (!rHasta || ymd(iso) <= rHasta);

    const ventasRango = DB.ventas.filter(v => inRange(v.fecha));
    const ventasRangoTotal = sum(ventasRango, v => v.total);
    const pagadoRango = sum(ventasRango.filter(v => (v.estatusPago || "") === "Pagado"), v => v.total);
    const saldoRango = sum(ventasRango.filter(v => (v.estatusPago || "") !== "Pagado"), v => Math.max(0, v.saldo || 0));
    const totalGastosRango = sum(DB.gastos.filter(g => inRange(g.fecha)), g => g.monto);

    const countTicketsRango = ventasRango.length || 1;
    const ticketProm = ventasRangoTotal / countTicketsRango;

    const productosVendidosRango = sum(ventasRango, v => sum(v.items, it => it.cant));
    const mapCatByProd = new Map(DB.productos.map(p => [p.producto, p.categoria]));
    let pastelesVendidosRango = 0;
    ventasRango.forEach(v => v.items.forEach(it => { if ((mapCatByProd.get(it.prod) || "") === "Pasteles") { pastelesVendidosRango += it.cant; } }));

    const kpi = document.getElementById("kpi-cards");
    if (kpi) {
        kpi.innerHTML = `
      <div class="box"><h3>Ventas (rango)</h3><b>${fmt(ventasRangoTotal)}</b></div>
      <div class="box"><h3>Pagado (rango)</h3><b>${fmt(pagadoRango)}</b></div>
      <div class="box"><h3>CxC (rango)</h3><b>${fmt(saldoRango)}</b></div>
      <div class="box"><h3>Gastos (rango)</h3><b>${fmt(totalGastosRango)}</b></div>
      <div class="box"><h3>Utilidad (rango)</h3><b>${fmt(ventasRangoTotal - totalGastosRango)}</b></div>
      <div class="box"><h3>Ticket promedio</h3><b>${fmt(ticketProm)}</b></div>
      <div class="box"><h3>Pasteles vendidos</h3><b>${pastelesVendidosRango}</b></div>
      <div class="box"><h3>Productos vendidos</h3><b>${productosVendidosRango}</b></div>
      <div class="box"><h3>Tickets</h3><b>${ventasRango.length}</b></div>
    `;
    }

    // Series por día
    const start = new Date(rDesde); const end = new Date(rHasta); const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) { days.push(ymd(d)); }
    const ventasPorDia = days.map(d => sum(DB.ventas.filter(v => ymd(v.fecha) === d), v => v.total));
    drawChartLine("chVentas", days, ventasPorDia, () => { });

    // Métodos de pago
    const pagos = {};
    DB.ventas.filter(v => inRange(v.fecha)).forEach(v => v.pagos.forEach(p => pagos[p.metodo] = (pagos[p.metodo] || 0) + p.monto));
    drawChartDoughnut("chMetodos", Object.keys(pagos), Object.values(pagos), () => { });

    // Ventas por categoría
    const ventasRangoItems = {};
    const mapProdCat2 = new Map(DB.productos.map(p => [p.producto, p.categoria]));
    ventasRango.forEach(v => v.items.forEach(it => {
        const cat = mapProdCat2.get(it.prod) || "(sin cat)";
        ventasRangoItems[cat] = (ventasRangoItems[cat] || 0) + it.precio * it.cant;
    }));
    drawChartBar("chCategorias", Object.keys(ventasRangoItems), Object.values(ventasRangoItems), () => { });

    // Gastos por categoría
    const gRango = DB.gastos.filter(g => inRange(g.fecha));
    const gCat = {}; gRango.forEach(g => gCat[g.categoria] = (g.categoria in gCat ? gCat[g.categoria] : 0) + g.monto);
    drawChartBar("chGastos", Object.keys(gCat), Object.values(gCat), () => { });

    // Top 3 productos por cantidad
    const topCount = {};
    ventasRango.forEach(v => v.items.forEach(it => { topCount[it.prod] = (topCount[it.prod] || 0) + Number(it.cant || 0); }));
    const top3 = Object.entries(topCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
    drawChartBar("chTop3", top3.map(x => x[0]), top3.map(x => x[1]), () => { });

    // Ventas por día de semana
    const ventasPorDow = Array.from({ length: 7 }, () => 0);
    ventasRango.forEach(v => { const d = new Date(v.fecha).getDay(); ventasPorDow[d] += v.total; });
    drawChartBar("chDow", DOW_ES, ventasPorDow, () => { });

    // Ventas por canal
    const byCanal = {}; ventasRango.forEach(v => { const k = v.canal || '—'; byCanal[k] = (byCanal[k] || 0) + v.total; });
    drawChartBar('chCanal', Object.keys(byCanal), Object.values(byCanal), () => { });


    // Pagado vs Saldo (rango)
    const pagadoMonto = sum(ventasRango, v => sum(v.pagos || [], p => Number(p.monto || 0)));
    const saldoMonto = sum(ventasRango, v => Math.max(0, Number(v.saldo || 0)));
    drawChartDoughnut('chPagadoSaldo', ['Pagado', 'Saldo'], [pagadoMonto, saldoMonto], () => { });

    // Ticket promedio por día
    const totByDay = {}; const cntByDay = {};
    ventasRango.forEach(v => { const d0 = ymd(v.fecha); totByDay[d0] = (totByDay[d0] || 0) + v.total; cntByDay[d0] = (cntByDay[d0] || 0) + 1; });
    const avgTicket = days.map(d => cntByDay[d] ? (totByDay[d] / cntByDay[d]) : 0);
    drawChartLine('chTicketProm', days, avgTicket, () => { });

    // Próximas 24h
    const ahora = Date.now();
    const prox24h = ahora + 24 * 60 * 60 * 1000;
    const entregas = DB.ventas.filter(v => {
        const f = v?.entrega?.fecha ? new Date(v.entrega.fecha).getTime() : NaN;
        const okFecha = !isNaN(f) && f >= ahora && f <= prox24h;
        const okStatus = (v.estatusEntrega || "Por preparar") !== 'Entregado' && (v.estatusEntrega || "Por preparar") !== 'Cancelado';
        return okFecha && okStatus;
    }).sort((a, b) => new Date(a.entrega.fecha) - new Date(b.entrega.fecha));
    const tbp = document.querySelector('#tabla-entregas-proximas tbody');
    if (tbp) {
        tbp.innerHTML = (entregas.map(v => `<tr>
      <td>${v.folio}</td>
      <td>${v.clienteNombre || 'Mostrador'}</td>
      <td>${(v.entrega?.fecha || '').replace('T', ' ').slice(0, 16)}</td>
      <td>${v.envioMetodo || '—'}</td>
      <td>${v.estatusEntrega || '—'}</td>
      <td>${(v.notas || '')}</td>
    </tr>`).join('')) || `<tr><td colspan="6" class="muted">Sin entregas próximas</td></tr>`;
    }
}

// Gráficas seguras (no truenan si falta el canvas)
function chartSafeCtx(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const ctx = el.getContext && el.getContext('2d');
    return ctx || null;
}
function drawChartLine(id, labels, data, cb) {
    const ctx = chartSafeCtx(id); if (!ctx) { cb && cb(null); return; }
    if (window[id + "_inst"]) window[id + "_inst"].destroy();
    const pal = chartPalette();
    const inst = new Chart(ctx, { type: "line", data: { labels: labels || [], datasets: [{ label: "Monto", data: (data || []), tension: 0.35, borderWidth: 2, borderColor: pal[0], backgroundColor: toRgba(pal[0], .15), pointRadius: 2 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: toRgba(cssVar('--p-light') || '#e5e7eb', .6) } }, x: { grid: { display: false } } } } });
    window[id + "_inst"] = inst;
    window._charts = (window._charts || []).filter(c => c?.canvas?.id !== id);
    window._charts.push(inst);
    cb && cb(inst);
}
function drawChartBar(id, labels, data, cb) {
    const ctx = chartSafeCtx(id); if (!ctx) { cb && cb(null); return; }
    if (window[id + "_inst"]) window[id + "_inst"].destroy();
    const pal = chartPalette();
    const inst = new Chart(ctx, { type: "bar", data: { labels: labels || [], datasets: [{ label: "Monto", data: (data || []), backgroundColor: pal[1] }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: toRgba(cssVar('--p-light') || '#e5e7eb', .6) } }, x: { grid: { display: false } } } } });
    window[id + "_inst"] = inst;
    window._charts = (window._charts || []).filter(c => c?.canvas?.id !== id);
    window._charts.push(inst);
    cb && cb(inst);
}
function drawChartDoughnut(id, labels, data, cb) {
    const ctx = chartSafeCtx(id); if (!ctx) { cb && cb(null); return; }
    if (window[id + "_inst"]) window[id + "_inst"].destroy();
    const pal = chartPalette();
    const colors = (data || []).map((_, i) => pal[i % pal.length]);
    const inst = new Chart(ctx, { type: "doughnut", data: { labels: labels || [], datasets: [{ data: (data || []), backgroundColor: colors }] }, options: { responsive: true, plugins: { legend: { position: "bottom" } } } });
    window[id + "_inst"] = inst;
    window._charts = (window._charts || []).filter(c => c?.canvas?.id !== id);
    window._charts.push(inst);
    cb && cb(inst);
}


/*******************************
 * GASTOS
 *******************************/
function renderProveedoresDatalist() {
    const dl = document.getElementById("dl-proveedores");
    // In API version, we might fetch providers distinct list or keep it in DB.proveedores cache
    // For now assuming DB.proveedores is populated or we extract from expenses
    const provs = [...new Set(DB.gastos.map(g => g.proveedor).filter(Boolean))];
    dl.innerHTML = provs.map(p => `<option value="${p}">`).join("");
}

async function guardarGasto() {
    const fecha = document.getElementById("g-fecha").value || hoyISO();
    const categoria = document.getElementById("g-cat").value;
    const metodo = document.getElementById("g-metodo").value;
    const proveedor = (document.getElementById("g-prov").value || "").trim();
    const monto = Number(document.getElementById("g-monto").value || 0);
    const desc = document.getElementById("g-desc").value || "";
    if (!categoria || !metodo || monto <= 0) { alert("Completa categoría, método y monto válido"); return; }

    let gastoObj = {};
    if (editingGastoId) {
        const idx = DB.gastos.findIndex(x => x.id == editingGastoId);
        if (idx > -1) {
            gastoObj = { ...DB.gastos[idx], fecha, categoria, proveedor, metodo, monto, desc };
        }
    } else {
        gastoObj = { id: id(), fecha, categoria, proveedor, metodo, monto, desc };
    }

    try {
        // We don't have a specific saveExpense API yet in api.js, let's assume generic or add it
        // For now I'll use a generic fetch here or assume api.saveExpense exists (I need to add it to api.js or use raw fetch)
        // I'll add it to api.js in a moment, but for now I'll use apiCall directly if possible or just assume it's there.
        // Wait, I defined api.js earlier. I didn't add saveExpense. I should update api.js.
        // But I can use the pattern: apiCall('/expenses', 'POST', gastoObj)
        await apiCall('/expenses', 'POST', gastoObj);

        toast("Gasto guardado");
        await loadDataFromAPI();
        renderProveedoresDatalist(); renderGastos(); renderDashboard();

        document.getElementById("g-monto").value = "";
        document.getElementById("g-desc").value = "";
        document.getElementById("g-prov").value = "";
        document.getElementById("g-fecha").value = hoyISO();
        editingGastoId = null;
    } catch (e) {
        console.error(e);
        toast("Error guardando gasto", "err");
    }
}

function renderGastos() {
    const desde = document.getElementById("fg-desde").value;
    const hasta = document.getElementById("fg-hasta").value;
    const prov = (document.getElementById("fg-prov").value || "").toLowerCase();
    const cat = document.getElementById("fg-cat")?.value || "";
    const met = document.getElementById("fg-metodo")?.value || "";
    const q = (document.getElementById("fg-q")?.value || "").toLowerCase();
    let arr = DB.gastos.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
    if (desde) arr = arr.filter(g => g.fecha >= desde);
    if (hasta) arr = arr.filter(g => g.fecha <= hasta);
    if (prov) arr = arr.filter(g => (g.proveedor || "").toLowerCase().includes(prov));
    if (cat) arr = arr.filter(g => (g.categoria || "") === cat);
    if (met) arr = arr.filter(g => (g.metodo || "") === met);
    if (q) arr = arr.filter(g => ((g.desc || "").toLowerCase().includes(q) || (g.proveedor || "").toLowerCase().includes(q)));
    const tb = document.querySelector("#tabla-gastos tbody");
    tb.innerHTML = arr.map(g => `<tr>
    <td>${g.fecha}</td>
    <td>${g.categoria}</td>
    <td>${g.proveedor || ""}</td>
    <td>${g.desc || ""}</td>
    <td class="right">${fmt(g.monto)}</td>
    <td>
      <button class="btn alt" onclick="editarGasto('${g.id}')">Editar</button>
      <button class="btn ghost" onclick="eliminarGasto('${g.id}')">Eliminar</button>
    </td>
  </tr>`).join("") || `<tr><td colspan="6" class="muted">Sin gastos</td></tr>`;

    // Resumen (total filtrado y nómina del mes actual)
    const totalFiltrado = sum(arr, g => g.monto);
    const [y, m] = hoyISO().split('-');
    const inicioMes = `${y}-${m}-01`;
    const finMes = new Date(Number(y), Number(m), 0).toISOString().slice(0, 10);
    const nomMes = sum(DB.gastos.filter(g => g.categoria === 'Nómina' && g.fecha >= inicioMes && g.fecha <= finMes), g => g.monto);
    const div = document.getElementById('gastos-resumen');
    if (div) { div.innerHTML = `Total filtrado: <b>${fmt(totalFiltrado)}</b> · Nómina (mes actual): <b>${fmt(nomMes)}</b>`; }
}

function editarGasto(id) {
    const g = DB.gastos.find(x => x.id == id);
    if (!g) return;
    editingGastoId = g.id;
    document.querySelector('[data-tab="tab-gastos"]').click();
    document.getElementById("g-fecha").value = g.fecha;
    document.getElementById("g-cat").value = g.categoria;
    document.getElementById("g-metodo").value = g.metodo;
    document.getElementById("g-prov").value = g.proveedor || "";
    document.getElementById("g-monto").value = g.monto;
    document.getElementById("g-desc").value = g.desc || "";
}

async function eliminarGasto(id) {
    const g = DB.gastos.find(x => x.id == id);
    if (!g) return;
    if (!confirm(`¿Eliminar el gasto de ${fmt(g.monto)} (${g.categoria}) del ${g.fecha}?`)) return;

    try {
        await apiCall(`/expenses/${id}`, 'DELETE');
        await loadDataFromAPI();
        renderGastos(); renderDashboard();
        toast("Gasto eliminado");
    } catch (e) {
        console.error(e);
        toast("Error eliminando gasto", "err");
    }
}

function fijarMesActualGastos() {
    const d = new Date();
    const y = d.getFullYear(); const m = d.getMonth();
    const inicio = new Date(y, m, 1).toISOString().slice(0, 10);
    const fin = new Date(y, m + 1, 0).toISOString().slice(0, 10);
    const a = document.getElementById('fg-desde'); if (a) a.value = inicio;
    const b = document.getElementById('fg-hasta'); if (b) b.value = fin;
    renderGastos();
}

// ARRANQUE
window.addEventListener("load", loadDataFromAPI);
