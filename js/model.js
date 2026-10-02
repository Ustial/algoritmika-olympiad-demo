const key = "algoritmika-pages-demo-v1";
export const uid = () => crypto.randomUUID();
export function normalize(s) {
    return s
        .normalize("NFKC")
        .toLocaleLowerCase("ru")
        .trim()
        .replace(/\s+/g, " ");
}
export function score(questions, answers) {
    return questions.reduce((sum, q) => {
        const a = answers[q.id];
        if (q.kind === "choice")
            return sum + (q.options.find((o) => o.id === a)?.points || 0);
        if (q.kind === "text")
            return (sum +
                Math.max(0, ...q.accepted
                    .filter((v) => normalize(v.value) ===
                    normalize(typeof a === "string" ? a : ""))
                    .map((v) => v.points)));
        return (sum +
            q.pairs.reduce((n, p) => n + (typeof a === "object" && a[p.id] === p.id ? p.points : 0), 0));
    }, 0);
}
export function completed(q, a) {
    const value = a[q.id];
    return q.kind === "matching"
        ? typeof value === "object" && Object.keys(value).length === 4
        : typeof value === "string" && value.trim().length > 0;
}
export function finish(a, now = Date.now()) {
    if (a.finishedAt || !a.startedAt || !a.deadline)
        return;
    a.finishedAt = Math.min(now, a.deadline);
    a.score = score(a.questions, a.answers);
}
export function expire(a, now = Date.now()) {
    if (!a.finishedAt && a.deadline && now >= a.deadline) {
        finish(a, now);
        return true;
    }
    return false;
}
export function ranked(attempts) {
    let last = -1, rank = 0;
    return [...attempts]
        .sort((a, b) => b.score - a.score)
        .map((a, i) => {
        if (last !== a.score)
            rank = i + 1;
        last = a.score;
        return { ...a, rank };
    });
}
export function seed() {
    const exams = [1, 2, 3, 4, 7].map((grade) => ({
        id: grade,
        title: grade === 7 ? "Первые шаги в Python" : `Олимпиада для ${grade} класса`,
        grade,
        duration: 45,
        status: "published",
        questions: [
            {
                id: uid(),
                title: grade === 7
                    ? "Что выведет программа?\nprint(2 * 5)"
                    : "Продолжи последовательность: 2, 4, 6, 8, …",
                kind: "choice",
                options: [8, 9, 10, 12].map((v, i) => ({
                    id: String(i),
                    text: String(v),
                    points: i === 2 ? 2 : i === 1 ? 1 : 0,
                })),
                accepted: [],
                pairs: [],
            },
            {
                id: uid(),
                title: "Как называется точный порядок действий для решения задачи?",
                kind: "text",
                options: [],
                accepted: [{ value: "алгоритм", points: 3 }],
                pairs: [],
            },
            {
                id: uid(),
                title: "Соедини выражение с его результатом.",
                kind: "matching",
                options: [],
                accepted: [],
                pairs: ["2 + 3", "4 × 2", "9 − 3", "12 ÷ 3"].map((left, i) => ({
                    id: uid(),
                    left,
                    right: ["5", "8", "6", "4"][i],
                    points: 1,
                })),
            },
        ],
    }));
    const schools = [
        "Демо · Школа №123",
        "Демо · Гимназия №39",
        "Демо · Лицей №180",
    ].map((name) => ({ id: uid(), name, active: true }));
    const exam = exams.find((e) => e.id === 3);
    const attempts = [
        "Участник Альфа",
        "Участник Бета",
        "Участник Гамма",
    ].map((name, i) => {
        const answers = {
            [exam.questions[0].id]: i === 0 ? "2" : "1",
            [exam.questions[1].id]: "алгоритм",
        };
        return {
            id: uid(),
            examId: 3,
            name,
            school: schools[i % 2].id,
            grade: 3,
            letter: "Б",
            startedAt: Date.now() - (12 + i) * 60000,
            deadline: Date.now() + 20 * 60000,
            finishedAt: Date.now(),
            questions: structuredClone(exam.questions),
            answers,
            score: score(exam.questions, answers),
        };
    });
    return { version: 1, exams, schools, attempts };
}
export function load() {
    const raw = localStorage.getItem(key);
    if (raw) {
        const data = JSON.parse(raw);
        if (data.version === 1 &&
            Array.isArray(data.exams) &&
            Array.isArray(data.schools) &&
            Array.isArray(data.attempts))
            return data;
        throw new Error("Не удалось прочитать демоданные. Откройте инструкцию и сбросьте демо.");
    }
    const data = seed();
    save(data);
    return data;
}
export function save(data) {
    localStorage.setItem(key, JSON.stringify(data));
}
export function reset() {
    const data = seed();
    save(data);
    sessionStorage.removeItem("olympiad-demo-admin");
    return data;
}
export const loggedIn = () => sessionStorage.getItem("olympiad-demo-admin") === "yes";
export function csv(rows, db) {
    const safe = (v) => {
        let s = String(v);
        if (/^[\s]*[=+@\-]/.test(s))
            s = "'" + s;
        return '"' + s.replaceAll('"', '""') + '"';
    };
    return ("\ufeff" +
        [
            [
                "Место",
                "Участник",
                "Школа",
                "Класс",
                "Буква",
                "Баллы",
                "Дата",
                "Минуты",
            ],
            ...rows.map((a) => [
                a.rank,
                a.name,
                db.schools.find((s) => s.id === a.school)?.name || "Школа скрыта",
                a.grade,
                a.letter,
                a.score,
                new Date(a.finishedAt).toLocaleString("ru-RU"),
                ((a.finishedAt - a.startedAt) / 60000).toFixed(1),
            ]),
        ]
            .map((row) => row.map(safe).join(";"))
            .join("\r\n"));
}
