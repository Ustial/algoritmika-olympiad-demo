export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const el = (id) => document.getElementById(id);
export const go = (path) => {
    location.hash = path;
};
export const field = (name, label, value = "", type = "text", extra = "") => `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
export const banner = () => `<div class="demo-banner"><strong>Демонстрация для коллег</strong><span>Данные только в этом браузере · используйте вымышленные данные</span><a href="#/help">Инструкция и вход</a></div>`;
export function shell(content, admin = false) {
    document.body.className = admin ? "admin-body demo-admin" : "";
    el("app").innerHTML = admin
        ? `<aside class="sidebar"><a class="brand" href="#/admin"><img src="assets/logo.svg" alt="Алгоритмика"></a><div class="workspace-label">ОЛИМПИАДА <span>ДЕМО</span></div><nav aria-label="Управление"><a href="#/admin">▦ Олимпиады</a><a href="#/results">≡ Результаты</a><a href="#/schools">⌂ Школы</a><a href="#/help">Инструкция</a></nav><div class="sidebar-bottom"><a href="#/">Страница участника</a><div class="profile"><span class="avatar">Д</span><div><strong>demo</strong><small>Демонстрационный вход</small></div></div></div></aside><div class="page admin-page">${banner()}<header class="admin-top"><span>Алгоритмика / Школьная олимпиада</span><button class="text-button" id="logout">Выйти из демо</button></header><main id="main" class="main">${content}</main>${footer()}</div>`
        : `${banner()}<header class="public-header"><a class="brand" href="#/"><img src="assets/logo.svg" alt="Алгоритмика"></a><span class="header-label">Школьная олимпиада</span><a class="quiet-link" href="#/admin">Организаторам</a></header><main id="main" class="main">${content}</main>${footer()}`;
    document.getElementById("logout")?.addEventListener("click", () => {
        sessionStorage.removeItem("olympiad-demo-admin");
        go("/login");
    });
}
function footer() {
    return `<footer><span>Алгоритмика · Демонстрационная версия</span><a href="#/help">Как пользоваться</a></footer>`;
}
export const form = (id, fn) => {
    el(id).onsubmit = (e) => {
        e.preventDefault();
        const target = e.currentTarget;
        if (target.reportValidity())
            fn(new FormData(target));
    };
};
export function notify(s) {
    document.querySelector(".demo-status")?.remove();
    const div = document.createElement("div");
    div.className = "demo-status";
    div.setAttribute("role", "status");
    div.textContent = s;
    document.body.append(div);
    setTimeout(() => div.remove(), 5000);
}
export function missing() {
    shell('<section class="panel narrow"><h1>Страница не найдена</h1><a class="button" href="#/">На главную</a></section>');
}
export const text = (data, key) => String(data.get(key) || "").trim();
export const statuses = {
    draft: "Черновик",
    published: "Опубликован",
    closed: "Закрыт",
};
