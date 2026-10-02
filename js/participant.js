import { esc, el, go, field, shell, form, text, missing, } from "./ui.js";
import { uid, completed, expire, finish, } from "./model.js";
export function participantPage(path, ctx) {
    const { db } = ctx;
    if (path === "/") {
        shell(`<div class="public-intro"><span class="eyebrow">ИНФОРМАТИКА · МАТЕМАТИКА · ЛОГИКА</span><h1>Большие открытия<br>начинаются с тебя.</h1><p>Выбери свой класс, чтобы попробовать олимпиаду.</p></div><section class="exam-grid">${db.exams
            .filter((e) => e.status === "published")
            .map((e) => `<a class="exam-card" href="#/join/${e.id}"><div class="card-top"><span class="grade-number">${e.grade}<small>класс</small></span><span class="tag">${e.grade === 7 ? "Python" : "Логика и математика"}</span></div><h2>${esc(e.title)}</h2><p>Демонстрационные задания для знакомства с платформой.</p><div class="card-bottom"><span>${e.duration} минут · Заданий: ${e.questions.length}</span><strong>Участвовать</strong></div></a>`)
            .join("") ||
            '<p class="panel">Открытых тестов нет. Опубликуйте тест в демо-админке.</p>'}</section><div class="help-strip"><strong>Коллегам</strong><span>Начните с <a href="#/help">инструкции</a>: там есть тестовый вход в админку и короткий сценарий проверки.</span></div>`);
        return;
    }
    if (path.startsWith("/join/")) {
        const exam = db.exams.find((e) => e.id === Number(path.split("/")[2]) && e.status === "published");
        if (!exam) {
            missing();
            return;
        }
        const active = db.attempts.find((a) => a.examId === exam.id && !a.finishedAt);
        if (active) {
            go(active.startedAt ? "/play/" + active.id : "/prepare/" + active.id);
            return;
        }
        shell(`<div class="registration-layout"><aside class="registration-aside"><a href="#/">Все классы</a><div class="class-tile large">${exam.grade}<small>класс</small></div><h1>${esc(exam.title)}</h1><p>${exam.duration} минут · Ответы сохраняются в этом браузере</p><div class="demo-note">Демо для сотрудников. Не вводите настоящие сведения о детях и родителях.</div><button class="button secondary" id="autofill">Заполнить примером</button></aside><section class="panel registration-panel"><span class="eyebrow">ШАГ 1 ИЗ 2</span><h2>Давайте познакомимся</h2><form id="registration"><div class="form-grid">${field("last", "Фамилия ребёнка", "", "text", 'required maxlength="80"')}${field("first", "Имя ребёнка", "", "text", 'required maxlength="80"')}${field("middle", "Отчество (если есть)", "", "text", 'maxlength="80"')}${field("parent", "ФИО родителя", "", "text", 'required maxlength="200"')}${field("phone", "Телефон родителя", "", "tel", 'required placeholder="+7 000 000-00-00"')}<div class="field"><label for="school">Школа</label><select id="school" name="school" required><option value="">Выберите школу</option>${db.schools
            .filter((s) => s.active)
            .map((s) => `<option value="${s.id}">${esc(s.name)}</option>`)
            .join("")}</select></div>${field("grade", "Класс", exam.grade, "number", "readonly")}${field("letter", "Буква класса", "", "text", 'required maxlength="1" pattern="[А-Яа-яЁёA-Za-z]"')}</div><div class="consents"><p>Настоящие юридические согласия в этой демонстрации не собираются.</p><label class="check"><input type="checkbox" required> Я использую вымышленные данные и понимаю, что это демонстрация.</label></div><button class="button full-width">Продолжить</button><p class="caption center">Таймер пока не запущен. ФИО родителя и телефон в демо не сохраняются.</p></form></section></div>`);
        el("autofill").onclick = () => {
            for (const [name, value] of Object.entries({
                last: "Демонстрационный",
                first: "Участник",
                middle: "",
                parent: "Демонстрационный Родитель",
                phone: "+70000000000",
                letter: "Б",
            }))
                el(name).value = value;
            el("school").selectedIndex = 1;
        };
        form("registration", (f) => {
            const phone = text(f, "phone").replace(/\D/g, "");
            if (!/^[78]\d{10}$/.test(phone)) {
                ctx.notify("Введите номер в формате +7 000 000-00-00.");
                return;
            }
            const a = {
                id: uid(),
                examId: exam.id,
                name: [text(f, "last"), text(f, "first"), text(f, "middle")]
                    .filter(Boolean)
                    .join(" "),
                school: text(f, "school"),
                grade: exam.grade,
                letter: text(f, "letter").toUpperCase(),
                startedAt: null,
                deadline: null,
                finishedAt: null,
                questions: [],
                answers: {},
                score: 0,
            };
            db.attempts.push(a);
            if (ctx.persist())
                go("/prepare/" + a.id);
        });
        return;
    }
    const id = path.split("/")[2], a = db.attempts.find((x) => x.id === id);
    if (!a) {
        missing();
        return;
    }
    const exam = db.exams.find((e) => e.id === a.examId);
    if (!exam) {
        missing();
        return;
    }
    if (expire(a))
        ctx.persist();
    if (a.finishedAt || path.startsWith("/done/")) {
        if (!a.finishedAt) {
            go("/play/" + a.id);
            return;
        }
        shell(`<section class="panel narrow prepare"><div class="success-icon">✓</div><span class="eyebrow">ОЛИМПИАДА ЗАВЕРШЕНА</span><h1>Спасибо за участие!</h1><p>Твои ответы сохранены.</p><p class="muted">Мы подведём итоги олимпиады<br>и свяжемся с вами позже.</p><div class="demo-note">В этой демонстрации сообщения не отправляются. Коллеги могут проверить результат в демо-админке этого же браузера.</div><div class="demo-actions"><a class="button secondary" href="#/">На главную</a><a class="button" href="#/results?exam=${a.examId}">Проверить в демо-админке</a></div></section>`);
        return;
    }
    if (path.startsWith("/prepare/")) {
        if (a.startedAt) {
            go("/play/" + a.id);
            return;
        }
        shell(`<section class="panel narrow prepare"><span class="eyebrow">ШАГ 2 ИЗ 2</span><h1>Всё готово к старту!</h1><p>${esc(exam.title)} · ${a.grade} класс</p><div class="duration"><strong>${exam.duration}</strong><span>минут на задания</span></div><div class="instructions"><p>Проходи олимпиаду самостоятельно. Можно возвращаться к любому заданию.</p><p>Таймер запускается только после нажатия кнопки. Обновление страницы сохраняет прогресс.</p></div><button class="button full-width" id="start">Начать олимпиаду</button><p class="caption">В демо время проверяется браузером; серверная защита работает только в основном приложении.</p></section>`);
        el("start").onclick = () => {
            if (exam.status !== "published" || !exam.questions.length) {
                ctx.notify("Тест закрыт или ещё не содержит заданий.");
                return;
            }
            a.questions = structuredClone(exam.questions);
            a.startedAt = Date.now();
            a.deadline = a.startedAt + exam.duration * 60000;
            if (ctx.persist())
                go("/play/" + a.id);
        };
        return;
    }
    if (!a.startedAt) {
        go("/prepare/" + a.id);
        return;
    }
    shell(`<div class="play-heading"><div><span class="eyebrow">${a.grade} КЛАСС · ДЕМО</span><h1>${esc(exam.title)}</h1></div><div class="timer-box"><span>Осталось времени</span><strong id="timer" role="timer"></strong></div></div><div class="play-layout"><aside class="question-sidebar"><h3>Твои задания</h3><div class="question-nav" id="question-nav"></div><p class="muted" id="progress"></p><button id="finish" class="button secondary full-width">Завершить</button></aside><section class="panel task-panel"><span class="eyebrow" id="task-number"></span><h2 id="task-title"></h2><p class="muted" id="task-help"></p><div id="task-body"></div><div class="task-controls"><button class="button secondary" id="previous">Назад</button><span id="save-state" role="status">Сохранено в этом браузере</span><button class="button" id="next">Дальше</button></div></section></div><dialog id="finish-dialog"><h2>Завершить олимпиаду?</h2><p id="finish-summary"></p><p>После завершения изменить ответы не получится.</p><div class="dialog-actions"><button class="button secondary" id="cancel-finish">Вернуться</button><button class="button" id="confirm-finish">Завершить</button></div></dialog>`);
    let index = 0;
    const nav = el("question-nav"), body = el("task-body");
    const saveAnswer = (q, value) => {
        if (expire(a) || a.finishedAt) {
            ctx.persist();
            go("/done/" + a.id);
            return;
        }
        a.answers[q.id] = value;
        el("save-state").textContent = ctx.persist()
            ? "Сохранено в этом браузере"
            : "Не сохранено — проверьте доступ к хранилищу";
        renderNav();
    };
    const renderNav = () => {
        nav.innerHTML = a.questions
            .map((q, i) => `<button class="${completed(q, a.answers) ? "answered" : ""} ${i === index ? "current" : ""}" data-index="${i}" aria-label="Задание ${i + 1}${completed(q, a.answers) ? ", ответ заполнен" : ""}" aria-current="${i === index ? "step" : "false"}">${i + 1}</button>`)
            .join("");
        nav.querySelectorAll("button").forEach((b) => (b.onclick = () => {
            index = Number(b.dataset.index);
            renderQuestion();
        }));
        el("progress").textContent =
            `${a.questions.filter((q) => completed(q, a.answers)).length} из ${a.questions.length} заполнено`;
    };
    const renderQuestion = () => {
        renderNav();
        const q = a.questions[index], value = a.answers[q.id];
        el("task-number").textContent =
            `ЗАДАНИЕ ${index + 1} ИЗ ${a.questions.length}`;
        el("task-title").textContent = q.title;
        el("task-help").textContent =
            q.kind === "choice"
                ? "Выбери один вариант ответа."
                : q.kind === "text"
                    ? "Впиши свой ответ."
                    : "Выбери правильную пару для каждого элемента.";
        if (q.kind === "choice") {
            body.innerHTML = q.options
                .map((o) => `<label class="answer-option"><input type="radio" name="answer" value="${esc(o.id)}" ${value === o.id ? "checked" : ""}>${o.image ? `<img src="${esc(o.image)}" alt="${esc(o.text || "Вариант ответа")}">` : ""}<span>${esc(o.text)}</span></label>`)
                .join("");
            body
                .querySelectorAll("input")
                .forEach((input) => (input.onchange = () => saveAnswer(q, input.value)));
        }
        if (q.kind === "text") {
            body.innerHTML = `<input aria-label="Твой ответ" id="answer" maxlength="500" autocomplete="off" placeholder="Твой ответ" value="${esc(typeof value === "string" ? value : "")}">`;
            el("answer").oninput = (e) => saveAnswer(q, e.target.value);
        }
        if (q.kind === "matching") {
            const current = typeof value === "object" ? value : {};
            body.innerHTML = q.pairs
                .map((p) => `<div class="match-row"><label for="pair-${p.id}">${esc(p.left)}</label><select id="pair-${p.id}" data-pair="${p.id}"><option value="">Выбери пару</option>${[
                ...q.pairs,
            ]
                .sort((x, y) => x.id.localeCompare(y.id))
                .map((r) => `<option value="${r.id}" ${current[p.id] === r.id ? "selected" : ""} ${Object.entries(current).some(([key, v]) => key !== p.id && v === r.id) ? "disabled" : ""}>${esc(r.right)}</option>`)
                .join("")}</select></div>`)
                .join("");
            body.querySelectorAll("select").forEach((select) => (select.onchange = () => {
                const next = { ...current };
                if (select.value)
                    next[select.dataset.pair] = select.value;
                else
                    delete next[select.dataset.pair];
                saveAnswer(q, next);
                renderQuestion();
            }));
        }
        el("previous").disabled = index === 0;
        el("next").disabled = index === a.questions.length - 1;
    };
    el("previous").onclick = () => {
        if (index > 0) {
            index--;
            renderQuestion();
        }
    };
    el("next").onclick = () => {
        if (index < a.questions.length - 1) {
            index++;
            renderQuestion();
        }
    };
    const dialog = el("finish-dialog");
    el("finish").onclick = () => {
        el("finish-summary").textContent =
            `Заполнено ${a.questions.filter((q) => completed(q, a.answers)).length} из ${a.questions.length} заданий.`;
        dialog.showModal();
    };
    el("cancel-finish").onclick = () => dialog.close();
    el("confirm-finish").onclick = () => {
        finish(a);
        if (ctx.persist()) {
            dialog.close();
            go("/done/" + a.id);
        }
    };
    const tick = () => {
        const seconds = Math.max(0, Math.ceil((a.deadline - Date.now()) / 1000));
        el("timer").textContent =
            `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
        if (expire(a)) {
            ctx.persist();
            go("/done/" + a.id);
        }
    };
    renderQuestion();
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
}
