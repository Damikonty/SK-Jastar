/* =====================================================================
   JASTAR HUB — справочники и генератор ТЕСТОВЫХ данных.
   Все люди, показатели, оценки и рейтинги ниже — вымышленные (демо).
   В продакшене эти данные приходят из PostgreSQL (Supabase), см. schema.sql.
   ===================================================================== */

const SCHEMA_VERSION = 3;

const REGIONS_SEED = [
  { id: 'ast', name: 'г. Астана', city: 'Астана', lon: 71.43, lat: 51.13 },
  { id: 'alm', name: 'г. Алматы', city: 'Алматы', lon: 76.95, lat: 43.24 },
  { id: 'shy', name: 'г. Шымкент', city: 'Шымкент', lon: 69.59, lat: 42.32 },
  { id: 'aba', name: 'Абайская область', city: 'Семей', lon: 80.23, lat: 50.41 },
  { id: 'akm', name: 'Акмолинская область', city: 'Кокшетау', lon: 69.39, lat: 53.28 },
  { id: 'akt', name: 'Актюбинская область', city: 'Актобе', lon: 57.17, lat: 50.28 },
  { id: 'ala', name: 'Алматинская область', city: 'Конаев', lon: 77.07, lat: 43.87 },
  { id: 'aty', name: 'Атырауская область', city: 'Атырау', lon: 51.92, lat: 47.11 },
  { id: 'vko', name: 'Восточно-Казахстанская область', city: 'Усть-Каменогорск', lon: 82.61, lat: 49.95 },
  { id: 'zha', name: 'Жамбылская область', city: 'Тараз', lon: 71.37, lat: 42.9 },
  { id: 'zht', name: 'Жетысуская область', city: 'Талдыкорган', lon: 78.37, lat: 45.02 },
  { id: 'zko', name: 'Западно-Казахстанская область', city: 'Уральск', lon: 51.37, lat: 51.23 },
  { id: 'kar', name: 'Карагандинская область', city: 'Караганда', lon: 73.1, lat: 49.81 },
  { id: 'kos', name: 'Костанайская область', city: 'Костанай', lon: 63.62, lat: 53.21 },
  { id: 'kzy', name: 'Кызылординская область', city: 'Кызылорда', lon: 65.5, lat: 44.85 },
  { id: 'man', name: 'Мангистауская область', city: 'Актау', lon: 51.2, lat: 43.65 },
  { id: 'pav', name: 'Павлодарская область', city: 'Павлодар', lon: 76.97, lat: 52.29 },
  { id: 'sko', name: 'Северо-Казахстанская область', city: 'Петропавловск', lon: 69.15, lat: 54.87 },
  { id: 'tur', name: 'Туркестанская область', city: 'Туркестан', lon: 68.25, lat: 43.3 },
  { id: 'uly', name: 'Улытауская область', city: 'Жезказган', lon: 67.71, lat: 47.8 }
];

/* Упрощённый контур Казахстана (долгота, широта) — схематичный, для визуализации активности */
const KZ_OUTLINE = [
  [49.2,46.4],[48.6,46.8],[48.1,47.6],[47.3,47.7],[46.5,48.4],[46.8,49.0],[47.0,49.5],[46.9,50.0],[47.6,50.4],[48.4,50.6],
  [48.7,51.0],[49.6,51.3],[50.6,51.7],[51.9,51.5],[53.3,51.5],[54.5,51.0],[55.7,50.6],[56.7,51.0],[57.6,51.1],[58.5,51.0],
  [59.6,50.6],[60.5,50.8],[61.4,51.3],[61.0,51.9],[60.2,52.1],[60.8,52.6],[61.1,53.1],[62.0,53.5],[61.3,53.9],[61.8,54.1],
  [63.0,54.1],[64.2,54.4],[65.3,54.6],[66.5,54.9],[68.2,55.0],[69.0,55.4],[70.4,55.2],[71.0,54.8],[71.3,54.2],[72.3,54.1],
  [73.4,53.9],[73.4,53.5],[74.4,53.5],[76.4,54.2],[76.9,54.0],[78.0,53.1],[79.1,52.3],[80.0,51.3],[80.7,51.3],[81.4,50.8],
  [82.8,51.0],[83.4,50.9],[84.3,50.2],[85.1,49.6],[86.2,49.4],[86.9,49.2],[87.3,49.1],[86.6,48.6],[85.8,48.4],[85.6,47.4],
  [85.3,47.0],[83.9,46.9],[83.0,47.2],[82.6,46.4],[82.3,45.5],[81.0,45.2],[79.9,44.9],[80.5,44.2],[80.3,43.3],[80.6,42.9],
  [79.6,42.6],[79.1,42.8],[77.6,42.9],[76.0,42.9],[74.6,43.1],[74.2,43.3],[73.5,42.5],[72.8,42.6],[71.8,42.8],[71.2,42.6],
  [70.8,42.2],[70.2,41.6],[69.4,41.4],[68.9,41.0],[68.5,40.6],[67.9,41.1],[66.7,41.2],[66.5,42.0],[66.0,42.0],[66.1,43.0],
  [65.6,43.3],[64.9,43.7],[63.5,43.6],[62.0,43.5],[61.1,44.4],[60.0,44.8],[58.6,45.6],[58.0,45.6],[56.0,45.0],[56.0,41.3],
  [55.4,41.3],[54.8,41.9],[54.1,42.3],[53.0,42.1],[52.5,41.8],[52.6,42.6],[52.0,42.8],[51.3,43.2],[51.0,44.0],[51.3,44.5],
  [50.3,44.6],[50.0,44.9],[51.3,45.3],[52.6,45.4],[53.0,45.9],[53.1,46.5],[52.0,46.9],[51.2,47.1],[50.0,46.7],[49.2,46.4]
];

/* Организационная структура группы. Численность молодёжи (young) — ТЕСТОВАЯ. */
const ORGS_SEED = [
  { id: 'sk', type: 'fund', parentId: null, name: 'Самрук-Қазына', full: 'АО «Самрук-Қазына»', regionId: 'ast', sector: 'Фонд национального благосостояния', young: 420 },
  { id: 'kmg', type: 'portfolio', parentId: 'sk', name: 'КазМунайГаз', full: 'АО НК «КазМунайГаз»', regionId: 'ast', sector: 'Нефть и газ', young: 3200 },
  { id: 'ozm', type: 'subsidiary', parentId: 'kmg', name: 'Озенмунайгаз', full: 'АО «Озенмунайгаз»', regionId: 'man', sector: 'Добыча нефти', young: 1400 },
  { id: 'emg', type: 'subsidiary', parentId: 'kmg', name: 'Эмбамунайгаз', full: 'АО «Эмбамунайгаз»', regionId: 'aty', sector: 'Добыча нефти', young: 900 },
  { id: 'anpz', type: 'subsidiary', parentId: 'kmg', name: 'Атырауский НПЗ', full: 'ТОО «Атырауский нефтеперерабатывающий завод»', regionId: 'aty', sector: 'Нефтепереработка', young: 620 },
  { id: 'kto', type: 'subsidiary', parentId: 'kmg', name: 'КазТрансОйл', full: 'АО «КазТрансОйл»', regionId: 'ast', sector: 'Транспортировка нефти', young: 1100 },
  { id: 'kap', type: 'portfolio', parentId: 'sk', name: 'Казатомпром', full: 'АО «НАК «Казатомпром»', regionId: 'ast', sector: 'Атомная промышленность', young: 1300 },
  { id: 'umz', type: 'subsidiary', parentId: 'kap', name: 'Ульбинский металлургический завод', full: 'АО «Ульбинский металлургический завод»', regionId: 'vko', sector: 'Металлургия', young: 750 },
  { id: 'ivt', type: 'subsidiary', parentId: 'kap', name: 'Институт высоких технологий', full: 'ТОО «Институт высоких технологий»', regionId: 'alm', sector: 'Наука и R&D', young: 85 },
  { id: 'ktz', type: 'portfolio', parentId: 'sk', name: 'Қазақстан темір жолы', full: 'АО «НК «Қазақстан темір жолы»', regionId: 'ast', sector: 'Железнодорожный транспорт', young: 9500 },
  { id: 'ktzpp', type: 'subsidiary', parentId: 'ktz', name: 'Пассажирские перевозки', full: 'АО «Пассажирские перевозки»', regionId: 'ast', sector: 'Пассажирские перевозки', young: 1600 },
  { id: 'ktzgp', type: 'subsidiary', parentId: 'ktz', name: 'КТЖ – Грузовые перевозки', full: 'АО «КТЖ – Грузовые перевозки»', regionId: 'ast', sector: 'Грузовые перевозки', young: 4100 },
  { id: 'se', type: 'portfolio', parentId: 'sk', name: 'Самрук-Энерго', full: 'АО «Самрук-Энерго»', regionId: 'ast', sector: 'Электроэнергетика', young: 640 },
  { id: 'ales', type: 'subsidiary', parentId: 'se', name: 'АлЭС', full: 'АО «Алматинские электрические станции»', regionId: 'alm', sector: 'Тепло- и электроэнергетика', young: 720 },
  { id: 'egres', type: 'subsidiary', parentId: 'se', name: 'Экибастузская ГРЭС-1', full: 'ТОО «Экибастузская ГРЭС-1»', regionId: 'pav', sector: 'Электроэнергетика', young: 540 },
  { id: 'mges', type: 'subsidiary', parentId: 'se', name: 'Мойнакская ГЭС', full: 'АО «Мойнакская ГЭС»', regionId: 'ala', sector: 'Гидроэнергетика', young: 70 },
  { id: 'kegoc', type: 'portfolio', parentId: 'sk', name: 'KEGOC', full: 'АО «KEGOC»', regionId: 'ast', sector: 'Электрические сети', young: 1150 },
  { id: 'qg', type: 'portfolio', parentId: 'sk', name: 'QazaqGaz', full: 'АО «НК «QazaqGaz»', regionId: 'ast', sector: 'Газовая отрасль', young: 2300 },
  { id: 'ica', type: 'subsidiary', parentId: 'qg', name: 'Интергаз Центральная Азия', full: 'АО «Интергаз Центральная Азия»', regionId: 'ast', sector: 'Транспортировка газа', young: 950 },
  { id: 'kt', type: 'portfolio', parentId: 'sk', name: 'Казахтелеком', full: 'АО «Казахтелеком»', regionId: 'ast', sector: 'Телекоммуникации', young: 2700 },
  { id: 'kcell', type: 'subsidiary', parentId: 'kt', name: 'Kcell', full: 'АО «Kcell»', regionId: 'alm', sector: 'Мобильная связь', young: 640 },
  { id: 'kp', type: 'portfolio', parentId: 'sk', name: 'Казпочта', full: 'АО «Казпочта»', regionId: 'ast', sector: 'Почта и логистика', young: 2400 },
  { id: 'tks', type: 'portfolio', parentId: 'sk', name: 'Тау-Кен Самрук', full: 'АО «НГК «Тау-Кен Самрук»', regionId: 'ast', sector: 'Горнорудная отрасль', young: 310 },
  { id: 'qa', type: 'portfolio', parentId: 'sk', name: 'Qazaq Air', full: 'АО «Qazaq Air»', regionId: 'ast', sector: 'Авиаперевозки', young: 140 }
];

/* Сети с филиалами по всей стране — их сотрудники распределены по регионам */
const NETWORK_ORGS = ['ktz', 'ktzgp', 'ktzpp', 'kp', 'kt', 'kegoc', 'qg', 'ica'];

const CATS = [
  { id: 'prof', name: 'Профессиональное развитие', short: 'Проф. развитие', icon: 'growth', color: '#2f62d0' },
  { id: 'social', name: 'Социальная ответственность и волонтёрство', short: 'Волонтёрство', icon: 'hand', color: '#d0603a' },
  { id: 'sport', name: 'Спорт и здоровый образ жизни', short: 'Спорт и ЗОЖ', icon: 'run', color: '#1c9468' },
  { id: 'eco', name: 'Экология и устойчивое развитие', short: 'Экология', icon: 'leaf', color: '#4c8a28' },
  { id: 'innov', name: 'Инновации и цифровизация', short: 'Инновации', icon: 'bulb', color: '#6a50d0' },
  { id: 'edu', name: 'Образование и наставничество', short: 'Наставничество', icon: 'book', color: '#0a8d99' },
  { id: 'culture', name: 'Корпоративная культура', short: 'Корп. культура', icon: 'users', color: '#b0457e' },
  { id: 'inter', name: 'Межкорпоративное сотрудничество', short: 'Межкорп.', icon: 'link', color: '#2b5aa0' },
  { id: 'charity', name: 'Благотворительность', short: 'Благотворительность', icon: 'heart', color: '#c4483f' },
  { id: 'other', name: 'Другие инициативы', short: 'Другое', icon: 'spark', color: '#687890' }
];

const COUNCIL_ROLES = ['Председатель', 'Заместитель председателя', 'Секретарь', 'Региональный представитель', 'Член совета', 'Участник'];

const ACH_TYPES = {
  volunteer: { name: 'Волонтёрство', icon: 'hand', cat: 'social' },
  training: { name: 'Обучение и сертификация', icon: 'growth', cat: 'prof' },
  mentoring: { name: 'Наставничество', icon: 'book', cat: 'edu' },
  award: { name: 'Награда / благодарность', icon: 'award', cat: 'other' },
  sport: { name: 'Спортивное достижение', icon: 'run', cat: 'sport' },
  social: { name: 'Социальная инициатива', icon: 'heart', cat: 'social' }
};

const NEWS_KINDS = {
  news: 'Новость', photo: 'Фотоотчёт', video: 'Видео', announce: 'Анонс',
  success: 'История успеха', interview: 'Интервью', story: 'История сотрудника', practice: 'Лучшая практика'
};

const KB_KINDS = {
  case: 'Лучший проект', method: 'Методические рекомендации', presentation: 'Презентация',
  edu: 'Образовательный материал', howto: 'Инструкция', template: 'Шаблон', success: 'Успешный кейс'
};

/* ---------- Детерминированный генератор ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = {
  m: ['Айбек', 'Ержан', 'Нурлан', 'Данияр', 'Арман', 'Алибек', 'Бауыржан', 'Тимур', 'Руслан', 'Санжар', 'Олжас', 'Ерасыл', 'Максат', 'Дмитрий', 'Артём', 'Мирас', 'Азамат', 'Әлихан', 'Ринат', 'Ильяс', 'Дастан', 'Нурсултан', 'Адиль', 'Кирилл', 'Темирлан'],
  f: ['Айгерим', 'Асель', 'Дана', 'Жанель', 'Камила', 'Алия', 'Мадина', 'Аружан', 'Динара', 'Сабина', 'Томирис', 'Анна', 'Екатерина', 'Гульназ', 'Айдана', 'Мөлдір', 'Алина', 'Диана', 'Аяулым', 'Інжу', 'Карина', 'Жансая', 'Ботагоз', 'Виктория']
};
const SURNAMES = [
  ['Ахметов', 'Ахметова'], ['Бекенов', 'Бекенова'], ['Жумабаев', 'Жумабаева'], ['Касымов', 'Касымова'], ['Оспанов', 'Оспанова'],
  ['Сапаров', 'Сапарова'], ['Тулегенов', 'Тулегенова'], ['Иманов', 'Иманова'], ['Абдрахманов', 'Абдрахманова'], ['Есенов', 'Есенова'],
  ['Мусин', 'Мусина'], ['Ким', 'Ким'], ['Петров', 'Петрова'], ['Смагулов', 'Смагулова'], ['Кенжебаев', 'Кенжебаева'],
  ['Ибраев', 'Ибраева'], ['Байжанов', 'Байжанова'], ['Рахимов', 'Рахимова'], ['Нургалиев', 'Нургалиева'], ['Шарипов', 'Шарипова'],
  ['Омаров', 'Омарова'], ['Калиев', 'Калиева'], ['Дауленов', 'Дауленова'], ['Утегенов', 'Утегенова'], ['Жунусов', 'Жунусова'],
  ['Сулейменов', 'Сулейменова'], ['Аманжолов', 'Аманжолова'], ['Волков', 'Волкова'], ['Мухамедиев', 'Мухамедиева'], ['Тлеуов', 'Тлеуова']
];
const POSITIONS = ['Инженер', 'Ведущий инженер', 'Экономист', 'Специалист по закупкам', 'Аналитик', 'Ведущий специалист', 'Главный специалист', 'Менеджер проектов', 'HR-специалист', 'Юрист', 'Инженер-технолог', 'Диспетчер', 'Мастер участка', 'Специалист по ESG', 'Разработчик', 'Data-аналитик', 'Специалист по коммуникациям', 'Бухгалтер', 'Инженер-электрик', 'Специалист по охране труда', 'Энергетик', 'Геолог'];
const DEPTS = ['Департамент производства', 'Департамент цифровизации', 'Департамент по управлению персоналом', 'Финансовый департамент', 'Департамент стратегии', 'Служба охраны труда', 'Департамент закупок', 'Юридический департамент', 'Департамент устойчивого развития', 'Инженерно-технический центр', 'Департамент коммуникаций'];
const SKILLS = ['Управление проектами', 'Power BI', 'Python', 'SQL', 'Публичные выступления', 'Финансовый анализ', 'Lean', 'Agile', 'Переговоры', 'Event-менеджмент', 'Наставничество', 'Английский B2', 'Казахский язык', 'AutoCAD', 'Охрана труда', 'Data Science', 'Дизайн-мышление', 'SMM', 'Excel', 'ESG-отчётность', 'Фасилитация'];
const INTERESTS = ['цифровизация производства', 'энергопереход', 'наставничество', 'корпоративные финансы', 'ESG', 'карьерное развитие молодёжи', 'Data-аналитика', 'промышленная безопасность', 'волонтёрство', 'спорт и ЗОЖ', 'бережливое производство', 'HR-аналитика'];
const UNIS = ['ЕНУ им. Л. Н. Гумилёва', 'КазНУ им. аль-Фараби', 'Satbayev University', 'КБТУ', 'Назарбаев Университет', 'ВКТУ им. Д. Серикбаева', 'Карагандинский технический университет', 'АУЭС им. Г. Даукеева', 'Университет КАЗГЮУ', 'ЮКУ им. М. Ауэзова', 'Атырауский университет нефти и газа'];
const SPORTS = ['Мини-футбол', 'Бег, полумарафон', 'Волейбол', 'Баскетбол 3×3', 'Настольный теннис', 'Шахматы', 'Плавание', 'Велоспорт', 'Тогыз кумалак', ''];

const PROJECT_TPL = {
  prof: {
    titles: ['Школа молодого специалиста', 'Карьерный марафон «Шаг вперёд»', 'Клуб публичных выступлений', 'Акселератор молодых аналитиков', 'Программа кросс-стажировок', 'Лаборатория Power BI', 'Интенсив по управлению проектами'],
    kpis: [['Прошли обучение', 'чел.', 20, 140], ['Выдано сертификатов', 'шт.', 10, 80], ['Рост результатов итогового теста', '%', 10, 35]],
    problem: 'Молодые сотрудники в первые два года работы не получают системного развития управленческих и цифровых навыков.',
    goal: 'Сформировать практические навыки у молодых сотрудников и создать кадровый резерв.',
    result: 'Проведено {n} занятий, участники защитили итоговые проекты перед руководством.',
    effect: 'Трое выпускников включены в кадровый резерв, два проекта участников внедряются в работу подразделений.'
  },
  social: {
    titles: ['Волонтёрский корпус', 'Донорская акция «Капля жизни»', 'Тёплая зима — сбор вещей', 'Помощь центру для пожилых людей', 'Ремонт детской площадки'],
    kpis: [['Волонтёров', 'чел.', 15, 120], ['Волонтёрских часов', 'ч', 100, 900], ['Благополучателей', 'чел.', 30, 400]],
    problem: 'Социальным учреждениям региона не хватает рук и регулярной помощи.',
    goal: 'Организовать регулярную волонтёрскую помощь силами молодёжи компании.',
    result: 'Проведено {n} выездов, работа выполнена совместно с местным акиматом.',
    effect: 'Учреждения получили адресную помощь; сформирована постоянная команда волонтёров.'
  },
  sport: {
    titles: ['Корпоративная спартакиада', 'Забег «Energy Run»', 'Лига мини-футбола', 'Турнир по баскетболу 3×3', 'Марафон «10 000 шагов»'],
    kpis: [['Участников', 'чел.', 40, 300], ['Команд', 'шт.', 6, 24], ['Доля впервые участвующих', '%', 20, 60]],
    problem: 'Низкая физическая активность офисных и сменных сотрудников.',
    goal: 'Вовлечь молодых сотрудников в регулярные занятия спортом.',
    result: 'Проведено {n} игровых дней, сформированы сборные команды.',
    effect: 'Рост вовлечённости в корпоративные спортивные активности, укрепление командного духа.'
  },
  eco: {
    titles: ['Зелёный офис', 'Посадка деревьев «Жасыл ел»', 'Эко-субботник на берегу', 'Раздельный сбор отходов', 'Энергосбережение в офисе'],
    kpis: [['Высажено деревьев', 'шт.', 100, 900], ['Собрано вторсырья', 'кг', 200, 2500], ['Участников', 'чел.', 20, 150]],
    problem: 'Недостаточная экологическая культура и отсутствие практик раздельного сбора на объектах.',
    goal: 'Снизить экологический след подразделений и сформировать эко-привычки.',
    result: 'Проведено {n} акций, внедрены контейнеры раздельного сбора.',
    effect: 'Сокращение объёма несортированных отходов, вклад в ESG-показатели компании.'
  },
  innov: {
    titles: ['Хакатон по промышленной безопасности', 'Банк идей молодёжи', 'Чат-бот для новых сотрудников', 'Пилот цифрового двойника', 'ИИ-помощник для закупок'],
    kpis: [['Подано идей', 'шт.', 10, 70], ['Идей принято к внедрению', 'шт.', 2, 12], ['Экономический эффект', 'млн ₸', 5, 60]],
    problem: 'Идеи молодых сотрудников не доходят до внедрения из-за отсутствия понятного механизма.',
    goal: 'Создать канал отбора и пилотирования инициатив молодёжи.',
    result: 'Отобрано и проработано {n} инициатив, пилоты согласованы с владельцами процессов.',
    effect: 'Подтверждённый экономический эффект по пилотам; инициативы вошли в план цифровизации.'
  },
  edu: {
    titles: ['Наставничество для новичков «Buddy»', 'Лекторий отраслевых экспертов', 'Разговорный клуб английского', 'Финансовая грамотность для молодёжи', 'Профориентация в колледжах'],
    kpis: [['Пар «наставник — новичок»', 'шт.', 8, 60], ['Проведено занятий', 'шт.', 6, 40], ['Удовлетворённость участников', '%', 70, 95]],
    problem: 'Длительная адаптация новых сотрудников и слабая передача знаний.',
    goal: 'Ускорить адаптацию и передачу опыта внутри компании.',
    result: 'Проведено {n} встреч, разработан чек-лист адаптации.',
    effect: 'Сокращение срока адаптации новых сотрудников, снижение ранней текучести.'
  },
  culture: {
    titles: ['День молодёжи компании', 'Подкаст о профессиях', 'Фотоконкурс «Люди энергии»', 'Интеллектуальный квиз', 'Неделя открытых дверей'],
    kpis: [['Участников', 'чел.', 50, 400], ['Охват публикаций', 'тыс.', 2, 40], ['Индекс удовлетворённости', '%', 70, 96]],
    problem: 'Слабые горизонтальные связи между подразделениями.',
    goal: 'Укрепить корпоративную культуру и сообщество молодёжи.',
    result: 'Проведено {n} событий, подготовлены материалы для внутренних медиа.',
    effect: 'Рост вовлечённости по результатам пульс-опроса.'
  },
  inter: {
    titles: ['Межкорпоративный кейс-чемпионат', 'Форум молодёжи группы', 'Обмен практиками Молодёжных советов', 'Совместный хакатон ДЗО', 'Кросс-компанийская стажировка'],
    kpis: [['Компаний-участников', 'шт.', 3, 9], ['Участников', 'чел.', 40, 250], ['Совместных инициатив', 'шт.', 2, 10]],
    problem: 'Молодёжные советы группы работают разрозненно и не обмениваются практиками.',
    goal: 'Наладить устойчивое взаимодействие между советами портфельных компаний.',
    result: 'Проведено {n} совместных сессий, сформированы смешанные команды.',
    effect: 'Запущены совместные инициативы нескольких компаний группы.'
  },
  charity: {
    titles: ['Благотворительная ярмарка', 'Подарки детям к 1 июня', 'Помощь ветеранам', 'Сбор школьных принадлежностей', 'Помощь приюту для животных'],
    kpis: [['Собрано средств', 'тыс. ₸', 300, 3500], ['Благополучателей', 'чел.', 20, 300], ['Участников', 'чел.', 20, 150]],
    problem: 'Семьи в трудной жизненной ситуации нуждаются в адресной поддержке.',
    goal: 'Организовать прозрачный сбор и адресную передачу помощи.',
    result: 'Проведено {n} акций, отчёт о расходовании средств опубликован.',
    effect: 'Адресная помощь передана благополучателям, отчётность открыта.'
  },
  other: {
    titles: ['Онбординг-гид для молодёжи', 'Опрос вовлечённости молодёжи', 'Карта молодёжных инициатив', 'Клуб молодых родителей'],
    kpis: [['Участников', 'чел.', 30, 300], ['Охват опроса', '%', 30, 80], ['Подготовлено материалов', 'шт.', 3, 15]],
    problem: 'Нет единого источника информации для молодых сотрудников.',
    goal: 'Собрать и систематизировать информацию для молодёжи.',
    result: 'Подготовлено {n} материалов, результаты представлены руководству.',
    effect: 'Материалы используются HR-службой при адаптации.'
  }
};

const EVENT_TPL = {
  prof: ['Мастер-класс по Excel', 'Встреча с топ-менеджером', 'Карьерная сессия', 'Воркшоп по презентациям'],
  social: ['Волонтёрский выезд', 'Донорский день', 'Субботник в детском доме'],
  sport: ['Турнир по мини-футболу', 'Забег выходного дня', 'Турнир по настольному теннису'],
  eco: ['Эко-субботник', 'Посадка деревьев', 'Сбор вторсырья'],
  innov: ['Демо-день инициатив', 'Хакатон выходного дня', 'Лекция об ИИ в отрасли'],
  edu: ['Встреча наставников', 'Открытый лекторий', 'Разговорный клуб'],
  culture: ['Квиз молодёжи', 'Кинопоказ и обсуждение', 'Встреча новых сотрудников'],
  inter: ['Межкорпоративная стратегическая сессия', 'Встреча председателей МС', 'Нетворкинг молодёжи группы'],
  charity: ['Благотворительная ярмарка', 'Сбор подарков'],
  other: ['Общее собрание Молодёжного совета', 'Отчётная сессия совета']
};

const PLACES = ['Конференц-зал головного офиса', 'Онлайн, Microsoft Teams', 'Учебный центр', 'Городской парк', 'Спортивный комплекс', 'Коворкинг', 'Актовый зал филиала'];

/* ---------- Генерация ---------- */
function seedDB() {
  const R = mulberry32(20261103);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const rint = (a, b) => Math.floor(a + R() * (b - a + 1));
  const chance = (p) => R() < p;
  const shuffle = (a) => { const c = a.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
  const anchor = new Date(); anchor.setHours(12, 0, 0, 0);
  const dayISO = (offset) => { const d = new Date(anchor); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
  const tsISO = (offset, h = 10) => { const d = new Date(anchor); d.setDate(d.getDate() + offset); d.setHours(h, rint(0, 59)); return d.toISOString(); };

  const regions = REGIONS_SEED.map((r) => ({ ...r }));
  const orgs = ORGS_SEED.map((o) => ({
    ...o,
    about: `Молодёжный совет ${o.full} объединяет сотрудников до 35 лет и реализует проекты в области профессионального развития, социальной ответственности и корпоративной культуры. Описание и показатели — тестовые.`,
    council: { chairId: null, founded: 2014 + rint(0, 9), regionalReps: [] },
    demo: true
  }));
  /* Склонность к активности: небольшие советы специально сделаны очень активными, чтобы показать нормирование */
  const activity = { sk: 1.0, kmg: 1.15, ozm: 0.8, emg: 0.7, anpz: 0.75, kto: 0.95, kap: 1.1, umz: 1.0, ivt: 1.3, ktz: 1.05, ktzpp: 0.75, ktzgp: 0.7, se: 1.25, ales: 0.9, egres: 0.85, mges: 1.25, kegoc: 1.2, qg: 0.9, ica: 0.75, kt: 1.0, kcell: 1.05, kp: 0.7, tks: 1.1, qa: 1.2 };
  const quality = {}; orgs.forEach((o) => { quality[o.id] = 6.2 + R() * 2.6; });

  /* --- пользователи --- */
  const users = [];
  let uidN = 1;
  const usedNames = new Set();
  const makeName = () => {
    for (let i = 0; i < 50; i++) {
      const g = chance(0.5) ? 'm' : 'f';
      const s = pick(SURNAMES)[g === 'm' ? 0 : 1];
      const n = pick(NAMES[g]);
      const full = `${s} ${n}`;
      if (!usedNames.has(full)) { usedNames.add(full); return full; }
    }
    return 'Тестовый Пользователь ' + uidN;
  };
  const translit = (s) => s.toLowerCase().replace(/[^a-zа-яёәғқңөұүһі]/g, '').split('').map((c) => ({ а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sh', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ә: 'a', ғ: 'g', қ: 'k', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i', ъ: '', ь: '' }[c] ?? c)).join('');
  const makeUser = (o, extra) => {
    const name = makeName();
    const [sur, first] = name.split(' ');
    const id = 'u' + uidN++;
    const regionId = NETWORK_ORGS.includes(o.id) && chance(0.6) ? pick(regions).id : o.regionId;
    const startYear = rint(2016, 2025);
    const u = {
      id, name, email: `${translit(first)}.${translit(sur)}${uidN}@test.jastar.kz`, pass: null,
      position: pick(POSITIONS), companyId: o.id, dept: pick(DEPTS), regionId,
      city: regions.find((r) => r.id === regionId).city, startYear,
      bio: `Работаю в ${o.name} с ${startYear} года. В Молодёжном совете отвечаю за проекты и взаимодействие с подразделениями. Профиль тестовый.`,
      education: `${pick(UNIS)}, бакалавриат (${startYear - rint(0, 2)})` + (chance(0.35) ? `; магистратура (${startYear + rint(1, 3)})` : ''),
      interests: shuffle(INTERESTS).slice(0, 3).join(', '),
      skills: shuffle(SKILLS).slice(0, rint(3, 6)),
      sport: pick(SPORTS), councilRole: 'Участник', role: 'member', photo: null, media: [],
      verified: true, blocked: false, conflicts: [], createdAt: tsISO(-rint(60, 700)), demo: true,
      ...extra
    };
    users.push(u);
    return u;
  };

  const admin = makeUser(orgs[0], { position: 'Главный администратор платформы', role: 'admin', councilRole: 'Участник', dept: 'Департамент по управлению персоналом' });
  orgs.forEach((o) => {
    const n = Math.max(4, Math.min(16, Math.round(Math.sqrt(o.young) / 4) + 3));
    for (let i = 0; i < n; i++) {
      let extra = {};
      if (i === 0) extra = { councilRole: 'Председатель', role: 'chair', regionId: o.regionId, city: regions.find((r) => r.id === o.regionId).city };
      else if (i === 1) extra = { councilRole: 'Заместитель председателя' };
      else if (i === 2) extra = { councilRole: 'Секретарь' };
      else if (i === 3 && n >= 6) {
        const rg = NETWORK_ORGS.includes(o.id) ? pick(regions.filter((r) => r.id !== o.regionId)) : regions.find((r) => r.id === o.regionId);
        extra = { councilRole: 'Региональный представитель', role: 'regional', regionId: rg.id, city: rg.city };
      } else extra = { councilRole: chance(0.55) ? 'Член совета' : 'Участник' };
      const u = makeUser(o, extra);
      if (i === 0) o.council.chairId = u.id;
      if (extra.role === 'regional') o.council.regionalReps.push(u.id);
    }
  });
  /* Карагандинский региональный председатель КТЖ — для демо-входа */
  const ktz = orgs.find((o) => o.id === 'ktz');
  const regDemo = users.find((u) => u.companyId === 'ktz' && u.role === 'regional');
  if (regDemo) { regDemo.regionId = 'kar'; regDemo.city = 'Караганда'; }
  ktz.council.regionalReps = users.filter((u) => u.companyId === 'ktz' && u.role === 'regional').map((u) => u.id);
  /* несколько участников ожидают подтверждения членства */
  users.filter((u) => u.role === 'member').slice(5, 200).forEach((u, i) => { if (i % 23 === 0) u.verified = false; });

  /* --- эксперты --- */
  const experts = [
    { org: null, title: 'Внешний эксперт, проектный менеджмент', conflicts: [] },
    { org: null, title: 'Внешний эксперт, социальные проекты и НКО', conflicts: [] },
    { org: 'kmg', title: 'Эксперт группы, КазМунайГаз', conflicts: ['kmg'] },
    { org: 'kap', title: 'Эксперт группы, Казатомпром', conflicts: ['kap'] },
    { org: null, title: 'Внешний эксперт, HR и развитие персонала', conflicts: ['qa'] },
    { org: 'kegoc', title: 'Эксперт группы, KEGOC', conflicts: ['kegoc'] }
  ].map((x) => {
    const host = x.org ? orgs.find((o) => o.id === x.org) : orgs[0];
    return makeUser(host, { role: 'expert', councilRole: 'Участник', position: x.title, companyId: x.org, conflicts: x.conflicts, regionId: 'ast', city: 'Астана', dept: x.org ? 'Экспертный пул группы' : 'Независимый эксперт', bio: 'Независимый эксперт платформы JASTAR HUB. Профиль тестовый.' });
  });
  const expertsFor = (orgId) => experts.filter((x) => !conflictOf(x, orgId, orgs));

  /* --- проекты --- */
  const projects = [];
  let pN = 1;
  const catWeights = { prof: 16, social: 14, sport: 10, eco: 9, innov: 11, edu: 10, culture: 9, inter: 7, charity: 8, other: 4 };
  const catBag = Object.entries(catWeights).flatMap(([k, w]) => Array(w).fill(k));
  const statusBag = [...Array(70).fill('confirmed'), ...Array(8).fill('in_review'), ...Array(7).fill('submitted'), ...Array(5).fill('needs_info'), ...Array(5).fill('rejected'), ...Array(5).fill('draft')];
  const orgUsers = (oid) => users.filter((u) => u.companyId === oid && ['member', 'chair', 'regional'].includes(u.role));
  orgs.forEach((o) => {
    const count = Math.max(2, Math.round(activity[o.id] * (1 + Math.sqrt(o.young) / 7)));
    const titlesUsed = new Set();
    const team0 = orgUsers(o.id);
    for (let i = 0; i < count; i++) {
      const cat = i === 0 && o.id === 'se' ? 'inter' : pick(catBag);
      const tpl = PROJECT_TPL[cat];
      let title = pick(tpl.titles);
      if (titlesUsed.has(title)) title += ` — ${pick(['весна', 'осень', 'II поток', 'сезон 2', 'региональный этап'])}`;
      if (titlesUsed.has(title)) continue;
      titlesUsed.add(title);
      const status = pick(statusBag);
      const startOff = -rint(25, 430);
      const dur = rint(14, 110);
      let endOff = Math.min(startOff + dur, status === 'confirmed' || status === 'rejected' ? -6 : rint(-5, 20));
      if (endOff <= startOff) endOff = startOff + 7;
      const members = shuffle(team0);
      const leader = members[0];
      const team = [{ userId: leader.id, role: 'Руководитель проекта', share: 0 }];
      members.slice(1, rint(2, 5)).forEach((u) => team.push({ userId: u.id, role: pick(['Координатор', 'Участник команды', 'Ответственный за коммуникации', 'Аналитик', 'Ответственный за логистику']), share: 0 }));
      let partnerOrgIds = [];
      if (cat === 'inter' || chance(0.22)) {
        const others = shuffle(orgs.filter((x) => x.id !== o.id)).slice(0, cat === 'inter' ? rint(2, 4) : rint(1, 2));
        partnerOrgIds = others.map((x) => x.id);
        others.forEach((x) => { const cand = orgUsers(x.id); if (cand.length) team.push({ userId: pick(cand).id, role: 'Партнёр от ' + x.name, share: 0 }); });
      }
      /* доли вклада (сумма = 100) */
      const lead = rint(30, 45); team[0].share = lead;
      let rest = 100 - lead; const others = team.slice(1);
      others.forEach((t, k) => { const s = k === others.length - 1 ? rest : Math.max(5, Math.round(rest / (others.length - k) + rint(-5, 5))); t.share = Math.min(s, rest); rest -= t.share; });
      if (rest > 0) team[0].share += rest;
      const participants = rint(8, 15 + Math.round(Math.sqrt(o.young) * 1.6));
      const reach = Math.min(Math.round(participants * (1 + R() * 1.8)), Math.round(o.young * 0.45));
      const hours = ['social', 'charity', 'eco'].includes(cat) ? participants * rint(2, 6) : 0;
      const kpis = tpl.kpis.slice(0, rint(2, 3)).map(([name, unit, a, b]) => { const plan = rint(a, b); const fact = Math.round(plan * (0.72 + R() * 0.5)); return { name, unit, plan, fact }; });
      const photoN = rint(2, 6);
      const media = Array.from({ length: photoN }, (_, k) => ({ id: `m${pN}_${k}`, kind: 'photo', name: `Фото ${k + 1}`, placeholder: true }));
      media.push({ id: `m${pN}_d1`, kind: 'doc', name: 'Отчёт о реализации.pdf', size: rint(300, 2400) * 1024, placeholder: true });
      if (chance(0.5)) media.push({ id: `m${pN}_d2`, kind: 'doc', name: 'Список участников.xlsx', size: rint(20, 120) * 1024, placeholder: true });
      if (chance(0.3)) media.push({ id: `m${pN}_v1`, kind: 'video', name: 'Видеоотчёт.mp4', size: rint(20, 90) * 1024 * 1024, placeholder: true });
      const p = {
        id: 'p' + pN++, title, orgId: o.id, companyId: o.parentId && o.type === 'subsidiary' ? o.parentId : o.id,
        regionId: chance(0.8) ? leader.regionId : pick(regions).id, leaderId: leader.id, initiatorId: chance(0.7) ? leader.id : (team[1] || team[0]).userId,
        team, start: dayISO(startOff), end: dayISO(endOff), category: cat,
        desc: `${title} — инициатива Молодёжного совета ${o.name}. ${tpl.goal} Описание тестовое.`,
        goal: tpl.goal + ' Задачи: подготовить программу, привлечь участников, зафиксировать результаты и подготовить отчёт.',
        problem: tpl.problem, participants, reach, volunteerHours: hours,
        results: tpl.result.replace('{n}', rint(3, 14)), kpis, effectType: cat === 'innov' ? 'economic' : 'social', effect: tpl.effect,
        media, partners: partnerOrgIds.length ? 'Молодёжные советы компаний-партнёров группы' : (chance(0.4) ? 'Местный акимат, профильное НКО' : ''),
        partnerOrgIds, status, review: null, history: [], comments: [], createdBy: leader.id, createdAt: tsISO(startOff - rint(3, 15)), demo: true
      };
      p.history.push({ ts: p.createdAt, actorId: leader.id, action: 'Создан черновик' });
      if (status !== 'draft') {
        const ex = pick(expertsFor(o.id));
        p.submittedAt = tsISO(endOff + rint(1, 5));
        p.history.push({ ts: p.submittedAt, actorId: leader.id, action: 'Отправлено на проверку' });
        p.review = { expertId: ex.id, scores: null, verifiedReach: null, verifiedHours: null, comment: '', decidedAt: null, assignedAt: p.submittedAt };
        p.history.push({ ts: p.submittedAt, actorId: 'system', action: 'Назначен эксперт: ' + ex.name });
        if (status !== 'submitted') p.history.push({ ts: tsISO(endOff + rint(5, 8)), actorId: ex.id, action: 'Взято на рассмотрение' });
        if (['confirmed', 'rejected', 'needs_info'].includes(status)) {
          const base = status === 'rejected' ? 3.2 + R() * 1.8 : quality[o.id];
          const sc = (d) => Math.max(1, Math.min(10, Math.round((base + (R() - 0.5) * d) * 2) / 2));
          p.review.scores = { relevance: sc(2), results: sc(2.4), evidence: sc(2.6), reach: sc(2.2), kpi: sc(2.2) };
          p.review.verifiedReach = Math.round(reach * (status === 'rejected' ? 0.3 : 0.75 + R() * 0.25));
          p.review.verifiedHours = Math.round(hours * (0.8 + R() * 0.2));
          p.review.decidedAt = tsISO(Math.min(endOff + rint(8, 20), -1));
          p.review.comment = status === 'confirmed' ? pick(['Результаты подтверждены отчётом и списками участников.', 'KPI подтверждены, охват скорректирован по спискам регистрации.', 'Сильный проект, рекомендуется к тиражированию в группе.'])
            : status === 'rejected' ? 'Заявленный охват не подтверждён документами; результаты не измеримы.'
            : 'Приложите список участников с подписями и подтверждение фактических KPI.';
          p.history.push({ ts: p.review.decidedAt, actorId: ex.id, action: status === 'confirmed' ? 'Подтверждено экспертом' : status === 'rejected' ? 'Отклонено экспертом' : 'Запрошены уточнения', note: p.review.comment });
        }
      }
      projects.push(p);
    }
  });

  /* --- мероприятия --- */
  const events = [];
  let eN = 1;
  orgs.forEach((o) => {
    const n = Math.max(1, Math.round(activity[o.id] * (1 + Math.sqrt(o.young) / 14)));
    const people = orgUsers(o.id);
    for (let i = 0; i < n + 1; i++) {
      const upcoming = i === n || chance(0.22);
      const cat = pick(catBag);
      const off = upcoming ? rint(2, 62) : -rint(5, 400);
      const cap = Math.min(rint(20, 120), Math.max(15, Math.round(o.young * 0.5)));
      const reg = shuffle(users.filter((u) => ['member', 'chair', 'regional'].includes(u.role) && (rootOfSeed(u.companyId, orgs) === rootOfSeed(o.id, orgs) || chance(0.04)))).slice(0, Math.min(cap, rint(6, 30))).map((u) => u.id);
      const organizers = shuffle(people).slice(0, rint(1, 2)).map((u) => u.id);
      const status = upcoming ? 'planned' : pick(['confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed', 'submitted', 'in_review', 'needs_info']);
      const attended = upcoming ? 0 : Math.max(5, Math.round(cap * (0.5 + R() * 0.45)));
      const e = {
        id: 'e' + eN++, title: pick(EVENT_TPL[cat]), orgId: o.id, regionId: chance(0.85) ? o.regionId : pick(regions).id,
        date: dayISO(off), time: pick(['10:00', '11:00', '15:00', '16:30', '18:30']), place: pick(PLACES), category: cat,
        desc: `Мероприятие Молодёжного совета ${o.name}. Описание тестовое.`, organizers, capacity: cap, registered: reg,
        attended, summary: upcoming ? '' : 'Мероприятие проведено по программе, материалы и список участников приложены.',
        media: upcoming ? [] : [{ id: `em${eN}_1`, kind: 'photo', name: 'Фото 1', placeholder: true }, { id: `em${eN}_2`, kind: 'doc', name: 'Лист регистрации.pdf', size: 210000, placeholder: true }],
        status, review: null, history: [], createdBy: organizers[0], demo: true
      };
      if (!upcoming && status !== 'draft') {
        const ex = pick(expertsFor(o.id));
        e.review = { expertId: ex.id, scores: null, verifiedAttended: null, comment: '', assignedAt: tsISO(off + 2), decidedAt: null };
        if (status === 'confirmed') {
          const b = quality[o.id];
          const sc = () => Math.max(1, Math.min(10, Math.round((b + (R() - 0.5) * 2.4) * 2) / 2));
          e.review.scores = { relevance: sc(), results: sc(), evidence: sc(), reach: sc(), kpi: sc() };
          e.review.verifiedAttended = Math.round(attended * (0.85 + R() * 0.15));
          e.review.decidedAt = tsISO(off + rint(4, 12));
          e.review.comment = 'Проведение подтверждено листом регистрации и фотоотчётом.';
        }
        e.history.push({ ts: tsISO(off + 1), actorId: organizers[0], action: 'Итоги отправлены на подтверждение' });
      }
      events.push(e);
    }
  });

  /* --- личные достижения --- */
  const achievements = [];
  let aN = 1;
  const achTitles = {
    volunteer: ['Волонтёрство в центре реабилитации', 'Помощь на городском марафоне', 'Волонтёр донорской акции', 'Помощь приюту для животных'],
    training: ['Сертификат PMP (подготовка)', 'Курс «Финансы для нефинансистов»', 'Сертификат Power BI Data Analyst', 'Программа «Лидер изменений»', 'IELTS 7.0'],
    mentoring: ['Наставник для новых сотрудников', 'Наставник студентов-практикантов', 'Ментор хакатона'],
    award: ['Благодарственное письмо руководства', 'Лучший молодой специалист года', 'Почётная грамота отрасли'],
    sport: ['Полумарафон 21 км', 'Призёр корпоративной спартакиады', 'Чемпион турнира по шахматам'],
    social: ['Организация сбора помощи', 'Шефство над школой']
  };
  users.filter((u) => ['member', 'chair', 'regional'].includes(u.role)).forEach((u) => {
    const n = rint(0, 3);
    for (let i = 0; i < n; i++) {
      const type = pick(['volunteer', 'volunteer', 'training', 'training', 'mentoring', 'award', 'sport', 'social']);
      const status = pick(['confirmed', 'confirmed', 'confirmed', 'confirmed', 'submitted', 'in_review']);
      const off = -rint(10, 380);
      const a = {
        id: 'a' + aN++, userId: u.id, type, title: pick(achTitles[type]), date: dayISO(off),
        hours: type === 'volunteer' || type === 'social' ? rint(4, 36) : 0, org: type === 'training' ? pick(['Coursera', 'Учебный центр группы', 'Astana Hub', 'British Council']) : '',
        desc: 'Описание тестовое.', files: [{ id: `af${aN}`, kind: 'cert', name: type === 'training' ? 'Сертификат.pdf' : 'Подтверждение.pdf', size: 180000, placeholder: true }],
        status, review: null, history: [{ ts: tsISO(off + 1), actorId: u.id, action: 'Отправлено на проверку' }], demo: true
      };
      const ex = pick(expertsFor(u.companyId));
      a.review = { expertId: ex.id, scores: null, comment: '', assignedAt: tsISO(off + 1), decidedAt: null };
      if (status === 'confirmed') { a.review.decidedAt = tsISO(off + rint(2, 9)); a.review.comment = 'Документ проверен.'; a.review.verifiedHours = a.hours; }
      achievements.push(a);
    }
  });

  /* --- новости --- */
  const orgName = (id) => orgs.find((o) => o.id === id).name;
  const chairOf = (id) => orgs.find((o) => o.id === id).council.chairId;
  const newsSeed = [
    ['announce', 'sk', 'Стартовал приём заявок на межкорпоративный кейс-чемпионат', 'Команды из разных компаний группы решат реальные кейсы портфельных компаний.', -3],
    ['interview', 'se', 'Председатель Молодёжного совета о том, как измерять эффект проектов', 'Почему охват без результата ничего не говорит и как совет перешёл на KPI.', -6],
    ['photo', 'ktz', 'Фотоотчёт: молодёжь КТЖ высадила аллею в Караганде', 'Акция прошла в рамках экологического направления совета.', -9],
    ['success', 'ivt', 'Небольшая команда — большой результат: опыт ИВТ', 'Как совет из 85 молодых сотрудников вовлёк больше половины коллег.', -12],
    ['practice', 'kegoc', 'Лучшая практика: наставничество «Buddy» в KEGOC', 'Пошаговый разбор программы адаптации, которую можно тиражировать.', -15],
    ['news', 'kmg', 'Молодёжь КазМунайГаза провела хакатон по промышленной безопасности', 'Три решения отобраны для пилота на производственных объектах.', -18],
    ['story', 'umz', 'История сотрудника: от практиканта до руководителя проекта', 'Путь молодого инженера и роль Молодёжного совета в его развитии.', -22],
    ['video', 'kt', 'Видео: как устроен подкаст о профессиях Казахтелекома', 'Выпуск о том, как молодые сотрудники рассказывают о своей работе.', -26],
    ['news', 'qa', 'Qazaq Air: волонтёры передали подарки детскому центру', 'Акция проведена совместно с партнёрами из группы.', -31],
    ['announce', 'kap', 'Открыта регистрация на Школу молодого специалиста', 'Программа рассчитана на сотрудников со стажем до трёх лет.', -35],
    ['practice', 'mges', 'Как совет из 70 человек стал лидером по вовлечённости', 'Ставка на регулярность и небольшие, но измеримые проекты.', -40],
    ['news', 'kp', 'Казпочта запустила лигу мини-футбола в шести регионах', 'В первом сезоне участвуют команды филиалов.', -46],
    ['interview', 'kcell', 'Интервью: цифровые инициативы молодёжи Kcell', 'Чат-бот для адаптации и банк идей — что получилось за год.', -55],
    ['photo', 'ales', 'Фотоотчёт с субботника на территории ТЭЦ', 'Молодёжь АлЭС провела экологическую акцию.', -63],
    ['success', 'tks', 'Банк идей Тау-Кен Самрук: первые внедрения', 'Две инициативы молодёжи дали подтверждённый экономический эффект.', -71],
    ['news', 'qg', 'QazaqGaz провёл открытый лекторий для молодёжи', 'Отраслевые эксперты рассказали о развитии газовой отрасли.', -84]
  ];
  const news = newsSeed.map(([kind, orgId, title, lead, off], i) => ({
    id: 'n' + (i + 1), kind, orgId, title, lead, date: dayISO(off), authorId: chairOf(orgId), published: true, views: rint(80, 1900),
    body: [lead, `Материал подготовлен Молодёжным советом ${orgName(orgId)}. Это тестовая публикация: текст, участники и цифры вымышлены и служат для демонстрации раздела «Новости и медиа».`, 'В полной версии платформы публикации проходят модерацию, а связанная активность учитывается в рейтинге только после подтверждения независимым экспертом.'],
    demo: true
  }));

  /* --- база знаний --- */
  const kbSeed = [
    ['template', 'Шаблон паспорта проекта Молодёжного совета', 'Структура: проблема, цель, задачи, команда, KPI, бюджет, риски.', 'sk'],
    ['template', 'Шаблон отчёта о реализации проекта', 'Фактические результаты, KPI план/факт, охват, доказательства.', 'sk'],
    ['howto', 'Как организовать мероприятие: чек-лист на 4 недели', 'Пошаговый план от идеи до отчёта и фотоотчёта.', 'sk'],
    ['method', 'Методика оценки эффективности Молодёжных советов', 'Критерии, веса, нормирование по численности, процедура оспаривания.', 'sk'],
    ['method', 'Как формулировать измеримые KPI проекта', 'Примеры хороших и плохих KPI, связь с результатами.', 'sk'],
    ['case', 'Кейс: наставничество «Buddy» (KEGOC)', 'Программа адаптации с подтверждённым сокращением срока адаптации.', 'kegoc'],
    ['case', 'Кейс: волонтёрский корпус (Самрук-Энерго)', 'Регулярная волонтёрская помощь вместо разовых акций.', 'se'],
    ['success', 'Кейс: вовлечённость в небольшом коллективе (ИВТ)', 'Как добиться высокой доли вовлечённых при малой численности.', 'ivt'],
    ['presentation', 'Презентация: стратегия молодёжной политики группы', 'Основные направления и целевые показатели (тестовый материал).', 'sk'],
    ['presentation', 'Презентация: итоги работы советов за год', 'Шаблон годовой презентации совета.', 'sk'],
    ['edu', 'Курс: основы проектного управления для советов', '6 коротких уроков с заданиями.', 'kap'],
    ['edu', 'Гайд по публичным выступлениям', 'Структура выступления, работа с вопросами, слайды.', 'kt'],
    ['howto', 'Как подготовить доказательства для экспертизы', 'Какие документы принимаются и почему фото не влияют на баллы.', 'sk'],
    ['template', 'Шаблон положения о Молодёжном совете', 'Типовая структура положения для ДЗО.', 'sk']
  ];
  const knowledge = kbSeed.map(([kind, title, desc, orgId], i) => ({
    id: 'k' + (i + 1), kind, title, desc, orgId, date: dayISO(-rint(10, 300)), authorId: admin.id,
    tags: [KB_KINDS[kind]], content: kbContent(kind, title, desc), demo: true
  }));

  const db = {
    version: SCHEMA_VERSION, seededAt: anchor.toISOString(), lang: 'ru',
    regions, orgs, users, projects, events, achievements, news, knowledge,
    audit: [], appeals: [], notifications: [], ratingLog: [],
    settings: {
      wCompany: { projects: 25, reach: 20, social: 15, prof: 15, inter: 10, innov: 10, info: 5 },
      wPerson: { contrib: 30, lead: 20, init: 20, volunteer: 10, inter: 10, prof: 10 },
      infoCap: 12
    },
    session: { userId: null },
    demoAccounts: {
      admin: admin.id,
      chair: orgs.find((o) => o.id === 'kegoc').council.chairId,
      regional: regDemo ? regDemo.id : null,
      member: users.find((u) => u.companyId === 'qg' && u.role === 'member').id,
      expert: experts[0].id,
      expertConflict: experts[2].id
    }
  };
  /* аудит по тестовым проверкам */
  projects.filter((p) => p.review && p.review.decidedAt).slice(0, 40).forEach((p) => {
    db.audit.push({ id: 'l' + db.audit.length, ts: p.review.decidedAt, actorId: p.review.expertId, role: 'expert', action: p.status === 'confirmed' ? 'Подтверждение активности' : p.status === 'rejected' ? 'Отклонение активности' : 'Запрос уточнений', entityType: 'project', entityId: p.id, details: 'Тестовая запись: ' + p.title });
  });
  db.audit.sort((a, b) => a.ts.localeCompare(b.ts));
  /* открытая апелляция для демонстрации */
  const rej = projects.find((p) => p.status === 'rejected');
  if (rej) db.appeals.push({ id: 'ap1', entityType: 'project', entityId: rej.id, userId: rej.leaderId, reason: 'Списки участников были приложены отдельным файлом, прошу пересмотреть оценку охвата.', status: 'open', ts: tsISO(-2), resolution: '' });
  return db;
}

function rootOfSeed(id, orgs) {
  const o = orgs.find((x) => x.id === id);
  if (!o) return null;
  return o.type === 'subsidiary' ? o.parentId : o.id;
}

/* Конфликт интересов: эксперт не проверяет свою компанию и её ДЗО, а также задекларированные организации */
function conflictOf(expert, orgId, orgs) {
  if (!expert) return true;
  const root = rootOfSeed(orgId, orgs);
  const list = [...(expert.conflicts || [])];
  if (expert.companyId) list.push(expert.companyId);
  return list.some((c) => {
    const cr = rootOfSeed(c, orgs);
    return c === orgId || c === root || (cr && cr !== 'sk' && cr === root);
  });
}

function kbContent(kind, title, desc) {
  if (kind === 'template' && title.includes('паспорта')) {
    return `# ${title}\n\n1. Название проекта\n2. Компания-инициатор и ДЗО\n3. Регион\n4. Руководитель и команда (с долей вклада каждого, сумма 100%)\n5. Проблема, которую решает проект\n6. Цель и задачи\n7. Сроки: начало и завершение\n8. Измеримые KPI: показатель / единица / план / факт\n9. Ожидаемый социальный или экономический эффект\n10. Партнёры\n11. Перечень доказательств (списки участников, акты, отчёты)\n`;
  }
  if (kind === 'template' && title.includes('отчёта')) {
    return `# ${title}\n\n1. Краткое описание реализации\n2. Фактические результаты\n3. KPI: план / факт / % выполнения\n4. Количество участников и охваченных сотрудников (с подтверждающими списками)\n5. Волонтёрские часы (если применимо)\n6. Социальный или экономический эффект\n7. Приложения: отчёт, списки, фото- и видеоматериалы\n`;
  }
  if (kind === 'template') return `# ${title}\n\n1. Общие положения\n2. Цели и задачи совета\n3. Структура и порядок формирования\n4. Права и обязанности членов\n5. Порядок отчётности\n6. Заключительные положения\n`;
  return `# ${title}\n\n${desc}\n\nТестовый материал базы знаний. В рабочей версии здесь размещается полный текст, файлы и обсуждение.`;
}
