import {
  type Context,
  esc,
  el,
  go,
  field,
  shell,
  form,
  text,
  statuses,
  missing,
} from "./ui.js";
import {
  type Exam,
  type Question,
  uid,
  ranked,
  csv,
  loggedIn,
} from "./model.js";
export function adminPage(
  path: string,
  query: URLSearchParams,
  ctx: Context,
): void {
  if (!loggedIn()) {
    go("/login");
    return;
  }
  const { db } = ctx;
  if (path === "/admin") {
    shell(
      `<div class="page-heading"><div><span class="eyebrow">ПАНЕЛЬ ОРГАНИЗАТОРА · ДЕМО</span><h1>Олимпиады</h1><p>Попробуйте настроить тест и пройти его как участник.</p></div><a class="button" href="#/exam/new">＋ Создать тест</a></div><div class="stats"><div><span>Всего участников</span><strong>${db.attempts.length}</strong></div><div><span>Завершили олимпиаду</span><strong>${db.attempts.filter((a) => a.finishedAt).length}</strong></div><div><span>Открыто тестов</span><strong>${db.exams.filter((e) => e.status === "published").length}</strong></div></div><h2>Ваши тесты</h2><div class="test-list">${db.exams.map((e) => `<article class="test-row"><div class="class-tile ${e.grade === 7 ? "yellow" : ""}">${e.grade}<small>класс</small></div><div class="test-info"><div class="title-line"><h3><a href="#/exam/${e.id}">${esc(e.title)}</a></h3><span class="badge ${e.status}">${statuses[e.status]}</span></div><p>Заданий: ${e.questions.length} · ${e.duration} минут · Участников: ${db.attempts.filter((a) => a.examId === e.id).length}</p></div><div class="row-actions"><a href="#/results?exam=${e.id}">Результаты</a><a class="button secondary small" href="#/exam/${e.id}">Открыть тест</a></div></article>`).join("")}</div><div class="help-strip">Изменения видны только в вашем браузере. По ссылке коллега получит исходную демонстрацию, а не ваши отредактированные задания.</div>`,
      true,
    );
    return;
  }
  if (path === "/schools") {
    const edit = db.schools.find((s) => s.id === query.get("edit"));
    shell(
      `<h1>Школы</h1><div class="editor-layout"><form class="panel" id="school-form"><h2>${edit ? "Изменить" : "Добавить"} школу</h2>${field("name", "Название школы", edit?.name || "", "text", 'required maxlength="150"')}<label class="check"><input type="checkbox" name="active" ${!edit || edit.active ? "checked" : ""}> Доступна для регистрации</label><button class="button">Сохранить</button></form><section class="panel">${db.schools.map((s) => `<div class="school-row"><div><strong>${esc(s.name)}</strong><p class="caption">${s.active ? "Доступна" : "Скрыта"}</p></div><a href="#/schools?edit=${s.id}">Изменить</a></div>`).join("")}</section></div>`,
      true,
    );
    form("school-form", (f) => {
      const name = text(f, "name");
      if (db.schools.some((s) => s.id !== edit?.id && s.name === name)) {
        ctx.notify("Такая школа уже существует.");
        return;
      }
      if (edit) Object.assign(edit, { name, active: f.has("active") });
      else db.schools.push({ id: uid(), name, active: f.has("active") });
      if (ctx.persist()) {
        go("/schools");
        ctx.render();
        ctx.notify("Школа сохранена в этом браузере.");
      }
    });
    return;
  }
  if (path === "/results") {
    const exam =
      db.exams.find((e) => e.id === Number(query.get("exam"))) || db.exams[0];
    const school = query.get("school") || "",
      grade = query.get("grade") || "",
      letter = (query.get("letter") || "").toUpperCase();
    const rows = ranked(
      db.attempts.filter(
        (a) =>
          a.finishedAt &&
          a.examId === exam?.id &&
          (!school || a.school === school) &&
          (!grade || a.grade === Number(grade)) &&
          (!letter || a.letter === letter),
      ),
    );
    shell(
      `<div class="page-heading"><div><h1>Результаты</h1><p>Только попытки из этого браузера</p></div><button id="export" class="button secondary">Скачать CSV</button></div><form id="filters" class="panel filters"><div class="field"><label for="exam">Олимпиада</label><select name="exam" id="exam">${db.exams.map((e) => `<option value="${e.id}" ${e.id === exam?.id ? "selected" : ""}>${esc(e.title)}</option>`).join("")}</select></div><div class="field"><label for="school">Школа</label><select name="school" id="school"><option value="">Все школы</option>${db.schools.map((s) => `<option value="${s.id}" ${s.id === school ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></div>${field("grade", "Класс", grade, "number", 'min="1" max="11"')}${field("letter", "Буква", letter, "text", 'maxlength="1"')}<button class="button">Показать</button></form><div class="section-title"><h2>${esc(exam?.title || "Нет тестов")}</h2><span>Участников: ${rows.length}</span></div><div class="table-wrap panel"><table><thead><tr><th>Место</th><th>Участник</th><th>Школа</th><th>Класс</th><th>Баллы</th><th>Завершение</th><th>Минуты</th></tr></thead><tbody>${rows.map((a) => `<tr><td>${a.rank}</td><td>${esc(a.name)}</td><td>${esc(db.schools.find((s) => s.id === a.school)?.name || "")}</td><td>${a.grade} ${esc(a.letter)}</td><td>${a.score}</td><td>${new Date(a.finishedAt!).toLocaleString("ru-RU")}</td><td>${((a.finishedAt! - a.startedAt!) / 60000).toFixed(1)}</td></tr>`).join("") || '<tr><td colspan="7" class="empty">Нет результатов для выбранной группы.</td></tr>'}</tbody></table></div><p class="caption">При равенстве баллов — одинаковое место. Время показано в часовом поясе вашего браузера.</p>`,
      true,
    );
    form("filters", (f) =>
      go(
        "/results?" +
          new URLSearchParams(
            [...f].map(([k, v]) => [k, String(v)]),
          ).toString(),
      ),
    );
    el("export").onclick = () => {
      const url = URL.createObjectURL(
        new Blob([csv(rows, db)], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "olympiad-demo-results.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    return;
  }
  if (path.startsWith("/question/")) {
    questionEditor(path, ctx);
    return;
  }
  if (path.startsWith("/exam/")) {
    examEditor(path, ctx);
    return;
  }
  missing();
}
function examEditor(path: string, ctx: Context): void {
  const { db } = ctx,
    part = path.split("/")[2],
    exam = db.exams.find((e) => e.id === Number(part));
  if (!exam && part !== "new") {
    missing();
    return;
  }
  shell(
    `<a href="#/admin">Все олимпиады</a><div class="page-heading"><h1>${esc(exam?.title || "Новый тест")}</h1>${exam ? `<a class="button secondary" href="#/results?exam=${exam.id}">Результаты</a>` : ""}</div><div class="editor-layout"><section class="panel"><h2>Настройки</h2><form id="exam-form">${field("title", "Название", exam?.title || "", "text", 'required maxlength="160"')}<div class="field"><label for="grade">Класс</label><select id="grade" name="grade">${[1, 2, 3, 4, 7].map((g) => `<option ${exam?.grade === g ? "selected" : ""} value="${g}">${g} класс</option>`).join("")}</select></div>${field("duration", "Длительность, минут", exam?.duration || 45, "number", 'required min="1" max="180"')}<div class="field"><label for="status">Статус</label><select id="status" name="status">${Object.entries(
      statuses,
    )
      .map(
        ([s, label]) =>
          `<option value="${s}" ${exam?.status === s ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></div><button class="button">Сохранить настройки</button></form>${exam?.status === "published" ? `<div class="link-box"><a class="button secondary" href="#/join/${exam.id}">Пройти этот тест</a><p class="caption">Ваши правки остаются в этом браузере. У коллег будут свои копии демо.</p></div>` : ""}</section><section><div class="section-title"><h2>Задания</h2>${exam ? `<a class="button" href="#/question/${exam.id}/new">＋ Добавить</a>` : ""}</div>${exam?.questions.map((q, i) => `<article class="panel question-row"><span class="eyebrow">ЗАДАНИЕ ${i + 1} · ${{ choice: "Один вариант", text: "Ввод ответа", matching: "Сопоставление" }[q.kind]}</span><h3>${esc(q.title)}</h3><div class="row-actions"><a href="#/question/${exam.id}/${q.id}">Редактировать</a><button class="icon-button" data-up="${q.id}" aria-label="Поднять задание ${i + 1}" ${i === 0 ? "disabled" : ""}>↑</button><button class="icon-button" data-down="${q.id}" aria-label="Опустить задание ${i + 1}" ${i === exam.questions.length - 1 ? "disabled" : ""}>↓</button><button class="text-button danger" data-delete="${q.id}">Удалить</button></div></article>`).join("") || '<div class="panel empty">Сохраните настройки и добавьте задания.</div>'}</section></div>`,
    true,
  );
  form("exam-form", (f) => {
    const status = text(f, "status") as Exam["status"];
    if (status === "published" && !exam?.questions.length) {
      ctx.notify("Добавьте хотя бы одно задание перед публикацией.");
      return;
    }
    const values = {
      title: text(f, "title"),
      grade: Number(f.get("grade")),
      duration: Number(f.get("duration")),
      status,
    };
    const target = exam || {
      ...values,
      id: Math.max(0, ...db.exams.map((e) => e.id)) + 1,
      questions: [],
    };
    Object.assign(target, values);
    if (!exam) db.exams.push(target);
    if (ctx.persist()) {
      go("/exam/" + target.id);
      ctx.render();
      ctx.notify("Настройки сохранены.");
    }
  });
  if (exam) {
    document
      .querySelectorAll<HTMLButtonElement>(
        "[data-up],[data-down],[data-delete]",
      )
      .forEach(
        (b) =>
          (b.onclick = () => {
            const id = b.dataset.up || b.dataset.down || b.dataset.delete;
            const i = exam.questions.findIndex((q) => q.id === id);
            if (b.dataset.delete) {
              if (!confirm("Удалить это демонстрационное задание?")) return;
              exam.questions.splice(i, 1);
              if (!exam.questions.length) exam.status = "draft";
            } else {
              const to = i + (b.dataset.up ? -1 : 1);
              [exam.questions[i], exam.questions[to]] = [
                exam.questions[to],
                exam.questions[i],
              ];
            }
            if (ctx.persist()) ctx.render();
          }),
      );
  }
}
function questionEditor(path: string, ctx: Context): void {
  const [, , examId, qId] = path.split("/"),
    exam = ctx.db.exams.find((e) => e.id === Number(examId));
  if (!exam) {
    missing();
    return;
  }
  const existing = exam.questions.find((q) => q.id === qId);
  if (!existing && qId !== "new") {
    missing();
    return;
  }
  const q: Question = structuredClone(
    existing || {
      id: uid(),
      title: "",
      kind: "choice",
      options: Array.from({ length: 4 }, (_, i) => ({
        id: String(i),
        text: "",
        points: 0,
      })),
      accepted: [],
      pairs: Array.from({ length: 4 }, () => ({
        id: uid(),
        left: "",
        right: "",
        points: 1,
      })),
    },
  );
  while (q.options.length < 4)
    q.options.push({ id: String(q.options.length), text: "", points: 0 });
  while (q.pairs.length < 4)
    q.pairs.push({ id: uid(), left: "", right: "", points: 1 });
  shell(
    `<a href="#/exam/${exam.id}">${esc(exam.title)}</a><h1>${existing ? "Редактирование" : "Новое задание"}</h1><form class="panel question-form" id="question-form"><div class="field"><label for="title">Условие задания</label><textarea id="title" name="title" rows="4" required maxlength="5000">${esc(q.title)}</textarea></div><div class="field"><label for="kind">Тип задания</label><select id="kind" name="kind">${Object.entries(
      {
        choice: "Один вариант",
        text: "Ввод ответа",
        matching: "Сопоставление",
      },
    )
      .map(
        ([k, label]) =>
          `<option value="${k}" ${q.kind === k ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></div><section data-kind="choice"><h2>Четыре варианта ответа</h2>${q.options.map((o, i) => `<div class="option-editor">${field("option" + i, "Вариант " + (i + 1), o.text)}${field("points" + i, "Баллы", o.points, "number", 'min="0" max="100" required')}<div class="field full"><label for="image${i}">Изображение до 500 КБ</label><input id="image${i}" type="file" accept="image/png,image/jpeg,image/webp">${o.image ? `<img class="option-preview" src="${esc(o.image)}" alt="Текущее изображение"><label class="check"><input type="checkbox" name="clear${i}"> Убрать изображение</label>` : ""}</div></div>`).join("")}</section><section data-kind="text"><h2>Допустимые ответы</h2><p>По одному ответу на строку: <code>ответ | баллы</code>. Регистр и лишние пробелы не влияют на проверку.</p><div class="field"><label for="accepted">Ответы</label><textarea id="accepted" name="accepted" rows="5" maxlength="10000">${esc(q.accepted.map((a) => a.value + " | " + a.points).join("\n"))}</textarea></div></section><section data-kind="matching"><h2>Четыре правильные пары</h2>${q.pairs.map((p, i) => `<div class="option-editor">${field("left" + i, "Левый элемент " + (i + 1), p.left)}${field("right" + i, "Правильная пара", p.right)}${field("pairPoints" + i, "Баллы", p.points, "number", 'min="0" max="100" required')}</div>`).join("")}</section><div class="dialog-actions"><button class="button" id="save-question">Сохранить задание</button><a class="button secondary" href="#/exam/${exam.id}">Отмена</a></div></form>`,
    true,
  );
  const kind = el<HTMLSelectElement>("kind");
  const toggle = () =>
    document.querySelectorAll<HTMLElement>("[data-kind]").forEach((s) => {
      s.hidden = s.dataset.kind !== kind.value;
      s.querySelectorAll<HTMLInputElement>("input,textarea").forEach(
        (input) => (input.disabled = s.hidden),
      );
    });
  kind.onchange = toggle;
  toggle();
  el<HTMLFormElement>("question-form").onsubmit = async (e) => {
    e.preventDefault();
    const button = el<HTMLButtonElement>("save-question");
    button.disabled = true;
    try {
      const f = new FormData(el<HTMLFormElement>("question-form"));
      q.title = text(f, "title");
      q.kind = kind.value as Question["kind"];
      if (q.kind === "choice") {
        for (let i = 0; i < 4; i++) {
          const o = q.options[i];
          o.text = text(f, "option" + i);
          o.points = Number(f.get("points" + i));
          if (f.has("clear" + i)) o.image = "";
          const file = el<HTMLInputElement>("image" + i).files?.[0];
          if (file) {
            if (
              file.size > 500000 ||
              !["image/png", "image/jpeg", "image/webp"].includes(file.type)
            )
              throw new Error("Изображение: PNG, JPG или WebP, до 500 КБ.");
            o.image = await readImage(file);
          }
          if (!o.text && !o.image)
            throw new Error("Заполните все четыре варианта.");
        }
      }
      if (q.kind === "text") {
        q.accepted = text(f, "accepted")
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const at = line.lastIndexOf("|"),
              value = line.slice(0, at).trim(),
              points = Number(line.slice(at + 1).trim());
            if (
              at < 0 ||
              !value ||
              !line.slice(at + 1).trim() ||
              !Number.isInteger(points) ||
              points < 0 ||
              points > 100
            )
              throw new Error("Формат: ответ | целые баллы от 0 до 100.");
            return { value, points };
          });
        if (!q.accepted.length) throw new Error("Добавьте допустимый ответ.");
      }
      if (q.kind === "matching") {
        q.pairs.forEach((p, i) => {
          p.left = text(f, "left" + i);
          p.right = text(f, "right" + i);
          p.points = Number(f.get("pairPoints" + i));
          if (!p.left || !p.right)
            throw new Error("Заполните все четыре пары.");
        });
      }
      if (existing) exam.questions[exam.questions.indexOf(existing)] = q;
      else exam.questions.push(q);
      if (ctx.persist()) {
        go("/exam/" + exam.id);
        ctx.notify("Задание сохранено в этом браузере.");
      }
    } catch (error) {
      ctx.notify(
        error instanceof Error ? error.message : "Не удалось сохранить.",
      );
    } finally {
      button.disabled = false;
    }
  };
}
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error("Не удалось прочитать изображение."));
    reader.readAsDataURL(file);
  });
}
