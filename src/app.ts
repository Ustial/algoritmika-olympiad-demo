import { load, save, reset, expire } from "./model.js";
import { type Context, el, go, shell, form, text, notify } from "./ui.js";
import { adminPage } from "./admin.js";
import { participantPage } from "./participant.js";
let db: ReturnType<typeof load>;
let cleanup: (() => void) | undefined;
try {
  db = load();
} catch {
  shell(
    '<section class="panel narrow"><h1>Хранилище браузера недоступно</h1><p>Разрешите хранение данных для сайта или откройте обычное окно браузера.</p><button class="button" id="recover">Сбросить только данные демоверсии</button></section>',
  );
  el("recover").onclick = () => {
    try {
      reset();
      location.reload();
    } catch {
      notify("Браузер запрещает запись. Проверьте его настройки.");
    }
  };
  throw new Error("Demo storage unavailable");
}
const ctx: Context = {
  db,
  persist: () => {
    try {
      save(ctx.db);
      return true;
    } catch {
      notify(
        "Изменения не сохранены: хранилище заполнено или недоступно. Уменьшите изображения или сбросьте демо через инструкцию.",
      );
      return false;
    }
  },
  render,
  notify,
};
function render(): void {
  cleanup?.();
  cleanup = undefined;
  let changed = false;
  ctx.db.attempts.forEach((a) => {
    if (expire(a)) changed = true;
  });
  if (changed) ctx.persist();
  const [path = "/", search = ""] = (location.hash.slice(1) || "/").split("?"),
    query = new URLSearchParams(search);
  if (path === "/help") {
    help();
    return;
  }
  if (path === "/login") {
    shell(
      `<section class="panel login-panel"><span class="eyebrow">ДЕМОНСТРАЦИОННЫЙ ВХОД</span><h1>Вход организатора</h1><p>Условный вход для знакомства с интерфейсом. Он не защищает данные.</p><form id="login-form"><div class="field"><label for="username">Логин</label><input id="username" name="username" autocomplete="off" required></div><div class="field"><label for="password">Демо-пароль</label><input id="password" name="password" type="password" autocomplete="off" required></div><button class="button full-width">Войти</button></form><p class="demo-login-hint">Логин: <strong>demo</strong><br>Пароль: <strong>demo2026</strong></p><p class="caption">Это публичные тестовые данные. Не вводите свой настоящий пароль.</p></section>`,
    );
    form("login-form", (f) => {
      if (
        text(f, "username") === "demo" &&
        text(f, "password") === "demo2026"
      ) {
        sessionStorage.setItem("olympiad-demo-admin", "yes");
        go("/admin");
      } else notify("Для демонстрации используйте demo / demo2026.");
    });
    return;
  }
  if (/^\/(admin|exam|question|results|schools)(\/|$)/.test(path)) {
    adminPage(path, query, ctx);
    return;
  }
  cleanup = participantPage(path, ctx);
}
function help(): void {
  shell(
    `<section class="panel demo-help"><span class="eyebrow">КОЛЛЕГАМ · ИНСТРУКЦИЯ</span><h1>Как попробовать платформу</h1><p>Это интерактивная демонстрация на GitHub Pages. Можно пройти олимпиаду, настроить задания и проверить рейтинг.</p><div class="demo-note"><strong>Только вымышленные данные.</strong> Каждый браузер хранит свою копию. Общей базы, настоящей авторизации и серверного контроля времени здесь нет. Основное приложение Django реализует эти функции отдельно.</div><h2>Вход организатора</h2><p>Логин: <code>demo</code><br>Пароль: <code>demo2026</code></p><div class="demo-actions"><a class="button" href="#/login">Открыть вход</a><a class="button secondary" href="#/">Попробовать как участник</a></div><h2>Проверка за 5 минут</h2><ol><li>Откройте страницу участника и выберите <strong>3 класс</strong>.</li><li>Нажмите <strong>«Заполнить примером»</strong>. Подтвердите использование вымышленных данных и продолжите. Таймер ещё не запущен.</li><li>Нажмите <strong>«Начать олимпиаду»</strong>. Выберите вариант, введите текст и сопоставьте пары. Обновите страницу — ответы останутся.</li><li>Нажмите <strong>«Завершить»</strong> и подтвердите. Участнику баллы не показываются.</li><li>Войдите как организатор: <code>demo / demo2026</code>. В «Результатах» выберите 3 класс — ваша попытка появится рядом с примерами. Попробуйте фильтры и CSV.</li><li>В «Олимпиадах» откройте тест: измените длительность, добавьте задание, задайте баллы, поменяйте порядок. Изменения действуют на новые попытки в этом браузере.</li></ol><h2>Что можно проверить</h2><p>Три типа заданий, текст и изображения в вариантах, частичные баллы, школы, публикация и закрытие теста, таймер, сохранение при обновлении, завершение, одинаковые места, фильтры и CSV. Для быстрой проверки таймера поставьте в тесте 1 минуту и начните новую попытку.</p><h2>Особенности демонстрации</h2><p>Изменения коллег не видны друг другу. Даже по одинаковой ссылке у каждого своя копия тестов. Используйте одну вкладку: одновременное редактирование в нескольких вкладках для демо не предусмотрено. Очистка данных браузера удалит ваши правки. ФИО родителя и телефон не записываются. Правильные ответы и публичный демо-пароль доступны в коде, поэтому проводить настоящую олимпиаду здесь нельзя.</p><p>Результаты не отправляются организатору автоматически. Чтобы передать замечания, приложите скриншот, описание действия и ожидаемого результата. CSV можно скачать самостоятельно.</p><h2>Начать заново</h2><p>Кнопка удалит только ваши локальные данные этой демонстрации и восстановит пять тестов, три школы и три вымышленных результата.</p><button class="button secondary demo-reset" id="reset">Сбросить демонстрацию</button></section>`,
  );
  el("reset").onclick = () => {
    if (!confirm("Сбросить ваши локальные тесты и результаты демонстрации?"))
      return;
    try {
      ctx.db = reset();
      go("/");
      render();
      notify("Демонстрация восстановлена.");
    } catch {
      notify("Сброс не удался: хранилище недоступно.");
    }
  };
}
window.addEventListener("hashchange", () => {
  render();
  window.scrollTo(0, 0);
});
window.addEventListener("storage", (event) => {
  if (event.key === "algoritmika-pages-demo-v1") {
    ctx.db = load();
    render();
    notify(
      "Данные изменились в другой вкладке. Используйте одну вкладку для редактирования.",
    );
  }
});
render();
