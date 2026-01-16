import { AppData } from '../types';

export const schemaVersion = 1;

export const seedData: AppData = {
  schemaVersion,
  library: {
    exercises: [
      {
        id: 'ex-chin-tuck',
        name: 'Chin tuck',
        tags: ['шея'],
        steps: ['Сядьте ровно.', 'Мягко втяните подбородок назад.', 'Держите 5–10 секунд.'],
        cues: ['Шея длинная', 'Плечи расслаблены'],
        mistakes: ['Поднятые плечи', 'Резкий рывок'],
        regressions: ['Сделать у стены'],
        progressions: ['Добавить резинку']
      },
      {
        id: 'ex-neck-side-bend',
        name: 'Neck side bend',
        tags: ['шея'],
        steps: ['Наклоните голову к плечу.', 'Держите 15–20 секунд.'],
        cues: ['Плечи вниз'],
        mistakes: ['Крутить головой'],
        regressions: ['Меньше амплитуда'],
        progressions: ['Лёгкое давление рукой']
      },
      {
        id: 'ex-open-book',
        name: 'Open book thoracic rotation',
        tags: ['грудной отдел'],
        steps: ['Лягте на бок.', 'Откройте грудную клетку вверх.', 'Дышите глубоко.'],
        cues: ['Колени вместе'],
        mistakes: ['Отрыв коленей'],
        regressions: ['Меньше амплитуда'],
        progressions: ['Дольше удержание']
      },
      {
        id: 'ex-cat-cow',
        name: 'Cat-cow',
        tags: ['спина'],
        steps: ['На четвереньках.', 'Прогиб/округление спины.'],
        cues: ['Движение мягкое'],
        mistakes: ['Задержка дыхания'],
        regressions: ['Сидя'],
        progressions: ['Добавить паузу']
      },
      {
        id: 'ex-hip-flexor',
        name: 'Hip flexor stretch (half-kneeling)',
        tags: ['таз'],
        steps: ['Полуколено.', 'Подайте таз вперёд.', 'Держите 20–30 сек.'],
        cues: ['Корпус ровный'],
        mistakes: ['Прогиб в пояснице'],
        regressions: ['Меньше шаг'],
        progressions: ['Поднять руку вверх']
      },
      {
        id: 'ex-glute-bridge',
        name: 'Glute bridge',
        tags: ['ягодицы'],
        steps: ['Лёжа на спине.', 'Поднимите таз.', 'Сожмите ягодицы.'],
        cues: ['Рёбра вниз'],
        mistakes: ['Переразгиб'],
        regressions: ['Меньше амплитуда'],
        progressions: ['Одна нога']
      },
      {
        id: 'ex-bird-dog',
        name: 'Bird-dog',
        tags: ['стабилизация'],
        steps: ['Рука+нога в линию.', 'Держите 3–5 сек.'],
        cues: ['Таз стабилен'],
        mistakes: ['Провал в пояснице'],
        regressions: ['По отдельности'],
        progressions: ['Дольше удержание']
      },
      {
        id: 'ex-ankle-wall',
        name: 'Ankle wall mobility',
        tags: ['голеностоп'],
        steps: ['Колено к стене.', 'Пятка на полу.'],
        cues: ['Контроль'],
        mistakes: ['Отрыв пятки'],
        regressions: ['Меньше дистанция'],
        progressions: ['Дальше от стены']
      },
      {
        id: 'ex-chair-squat',
        name: 'Chair squat to box',
        tags: ['ноги'],
        steps: ['Сядьте на короб.', 'Встаньте без рывка.'],
        cues: ['Колени наружу'],
        mistakes: ['Падение на стул'],
        regressions: ['Выше короб'],
        progressions: ['Без коробки']
      },
      {
        id: 'ex-incline-pushup',
        name: 'Incline push-up',
        tags: ['грудь'],
        steps: ['От стены/стола.', 'Опускайтесь контролируемо.'],
        cues: ['Корпус прямой'],
        mistakes: ['Прогиб'],
        regressions: ['Выше опора'],
        progressions: ['Ниже опора']
      },
      {
        id: 'ex-backpack-row',
        name: 'Backpack row',
        tags: ['спина'],
        steps: ['Тяга рюкзака к поясу.', 'Пауза вверху.'],
        cues: ['Лопатки назад'],
        mistakes: ['Круглая спина'],
        regressions: ['Лёгкий вес'],
        progressions: ['Тяжелее вес']
      },
      {
        id: 'ex-dead-bug',
        name: 'Dead bug',
        tags: ['кор'],
        steps: ['Спина прижата.', 'Плавно опускайте руку/ногу.'],
        cues: ['Поясница на полу'],
        mistakes: ['Прогиб'],
        regressions: ['Только руки'],
        progressions: ['Дольше']
      },
      {
        id: 'ex-knee-plank',
        name: 'Knee plank',
        tags: ['кор'],
        steps: ['Колени на полу.', 'Держите 20–30 сек.'],
        cues: ['Рёбра вниз'],
        mistakes: ['Провис'],
        regressions: ['Меньше время'],
        progressions: ['Полная планка']
      },
      {
        id: 'ex-mcgill',
        name: 'McGill curl-up',
        tags: ['кор'],
        steps: ['Одна нога согнута.', 'Небольшой подъём головы/плеч.'],
        cues: ['Шея нейтрально'],
        mistakes: ['Сильный подъём'],
        regressions: ['Меньше время'],
        progressions: ['Дольше удержание']
      }
    ],
    protocols: [
      {
        id: 'proto-r10-warmup',
        name: 'R-10 Warmup',
        description: 'Разминка 10 минут с мягкой мобилизацией.',
        steps: [
          { text: 'Chin tuck', durationSec: 30, exerciseRef: 'ex-chin-tuck' },
          { text: 'Neck side bend', durationSec: 60, exerciseRef: 'ex-neck-side-bend' },
          { text: 'Open book rotation', durationSec: 60, exerciseRef: 'ex-open-book' },
          { text: 'Cat-cow', durationSec: 60, exerciseRef: 'ex-cat-cow' },
          { text: 'Hip flexor stretch', durationSec: 60, exerciseRef: 'ex-hip-flexor' },
          { text: 'Glute bridge', durationSec: 60, exerciseRef: 'ex-glute-bridge' },
          { text: 'Bird-dog', durationSec: 60, exerciseRef: 'ex-bird-dog' },
          { text: 'Ankle wall mobility', durationSec: 60, exerciseRef: 'ex-ankle-wall' }
        ]
      },
      {
        id: 'proto-s0-str',
        name: 'S0-STR',
        description: 'Круговая тренировка, 2 круга. Контроль темпа, отдых 60 сек.',
        steps: [
          { text: 'Chair squat to box x8', exerciseRef: 'ex-chair-squat' },
          { text: 'Incline push-up x8', exerciseRef: 'ex-incline-pushup' },
          { text: 'Backpack row x10', exerciseRef: 'ex-backpack-row' },
          { text: 'Dead bug x8/стор', exerciseRef: 'ex-dead-bug' },
          { text: 'Knee plank 20 сек', exerciseRef: 'ex-knee-plank' },
          { text: 'McGill curl-up x6/стор', exerciseRef: 'ex-mcgill' }
        ]
      }
    ],
    products: [
      {
        id: 'prod-chicken-thighs',
        name: 'Куриные бёдра (сырые, approx)',
        kcalPer100g: 185,
        proteinPer100g: 18,
        fatPer100g: 12,
        portionPresets: [{ label: '1 порция', grams: 180 }]
      },
      {
        id: 'prod-fish',
        name: 'Рыба (сырая, approx)',
        kcalPer100g: 120,
        proteinPer100g: 20,
        fatPer100g: 4,
        portionPresets: [{ label: '1 порция', grams: 160 }]
      },
      {
        id: 'prod-turkey-mince',
        name: 'Фарш индейки (approx)',
        kcalPer100g: 150,
        proteinPer100g: 19,
        fatPer100g: 8
      },
      {
        id: 'prod-eggs',
        name: 'Яйца (approx)',
        kcalPer100g: 143,
        proteinPer100g: 13,
        fatPer100g: 10,
        portionPresets: [{ label: '3 яйца', grams: 150 }]
      },
      {
        id: 'prod-greek-yogurt',
        name: 'Греческий йогурт (approx)',
        kcalPer100g: 97,
        proteinPer100g: 9,
        fatPer100g: 5,
        carbPer100g: 4,
        portionPresets: [{ label: '1 стакан', grams: 200 }]
      },
      {
        id: 'prod-cottage',
        name: 'Творог (approx)',
        kcalPer100g: 120,
        proteinPer100g: 16,
        fatPer100g: 5,
        carbPer100g: 3
      },
      {
        id: 'prod-kefir',
        name: 'Кефир (approx)',
        kcalPer100g: 60,
        proteinPer100g: 3,
        fatPer100g: 3,
        carbPer100g: 4,
        portionPresets: [{ label: '250 мл', grams: 250 }]
      },
      {
        id: 'prod-rice',
        name: 'Рис (сухой, approx)',
        kcalPer100g: 360,
        proteinPer100g: 7,
        fatPer100g: 1,
        carbPer100g: 80,
        portionPresets: [{ label: '50 г сухого', grams: 50 }]
      },
      {
        id: 'prod-buckwheat',
        name: 'Гречка (сухая, approx)',
        kcalPer100g: 340,
        proteinPer100g: 12,
        fatPer100g: 3,
        carbPer100g: 68,
        portionPresets: [{ label: '60 г сухого', grams: 60 }]
      },
      {
        id: 'prod-potatoes',
        name: 'Картофель (approx)',
        kcalPer100g: 77,
        proteinPer100g: 2,
        carbPer100g: 17,
        portionPresets: [{ label: '200 г', grams: 200 }]
      },
      {
        id: 'prod-cucumber',
        name: 'Огурец (approx)',
        kcalPer100g: 15
      },
      {
        id: 'prod-tomato',
        name: 'Помидор (approx)',
        kcalPer100g: 18
      },
      {
        id: 'prod-lettuce',
        name: 'Салат листовой (approx)',
        kcalPer100g: 15
      },
      {
        id: 'prod-onion',
        name: 'Лук (approx)',
        kcalPer100g: 40
      },
      {
        id: 'prod-carrot',
        name: 'Морковь (approx)',
        kcalPer100g: 41
      },
      {
        id: 'prod-bell-pepper',
        name: 'Перец болгарский (approx)',
        kcalPer100g: 26
      },
      {
        id: 'prod-zucchini',
        name: 'Кабачок (approx)',
        kcalPer100g: 17
      },
      {
        id: 'prod-broccoli',
        name: 'Брокколи (замороженная, approx)',
        kcalPer100g: 35
      },
      {
        id: 'prod-banana',
        name: 'Банан (approx)',
        kcalPer100g: 89,
        portionPresets: [{ label: '1 банан', grams: 120 }]
      },
      {
        id: 'prod-apple',
        name: 'Яблоко (approx)',
        kcalPer100g: 52,
        portionPresets: [{ label: '1 яблоко', grams: 150 }]
      },
      {
        id: 'prod-olive-oil',
        name: 'Оливковое масло (approx)',
        kcalPer100g: 884,
        fatPer100g: 100,
        portionPresets: [{ label: '1 ст.л.', grams: 14 }]
      }
    ],
    recipes: [
      {
        id: 'rec-baked-chicken',
        name: 'Запечённая курица',
        servings: 2,
        ingredients: [
          { productRef: 'prod-chicken-thighs', grams: 360 },
          { productRef: 'prod-olive-oil', grams: 10 }
        ],
        steps: ['Смешайте специи.', 'Запекать 25–30 мин при 200°С.'],
        notes: 'Соль/перец по вкусу.',
        tags: ['ужин']
      },
      {
        id: 'rec-cooked-rice',
        name: 'Рис отварной',
        servings: 3,
        ingredients: [{ productRef: 'prod-rice', grams: 150 }],
        steps: ['Промыть рис.', 'Варить 18–20 мин.'],
        tags: ['гарнир']
      },
      {
        id: 'rec-cooked-buckwheat',
        name: 'Гречка отварная',
        servings: 3,
        ingredients: [{ productRef: 'prod-buckwheat', grams: 180 }],
        steps: ['Промыть гречку.', 'Варить 15–18 мин.'],
        tags: ['гарнир']
      },
      {
        id: 'rec-boiled-potatoes',
        name: 'Картофель отварной',
        servings: 3,
        ingredients: [{ productRef: 'prod-potatoes', grams: 600 }],
        steps: ['Очистить.', 'Варить 20–25 мин.'],
        tags: ['гарнир']
      },
      {
        id: 'rec-salad',
        name: 'Салат огурец+помидор+салат',
        servings: 2,
        ingredients: [
          { productRef: 'prod-cucumber', grams: 200 },
          { productRef: 'prod-tomato', grams: 200 },
          { productRef: 'prod-lettuce', grams: 120 },
          { productRef: 'prod-olive-oil', grams: 10 }
        ],
        steps: ['Нарезать.', 'Смешать.', 'Заправить.'],
        tags: ['салат']
      },
      {
        id: 'rec-baked-fish',
        name: 'Рыба с лимоном',
        servings: 2,
        ingredients: [
          { productRef: 'prod-fish', grams: 320 },
          { productRef: 'prod-olive-oil', grams: 8 }
        ],
        steps: ['Сбрызнуть лимоном.', 'Запечь 20 мин.'],
        tags: ['ужин']
      },
      {
        id: 'rec-turkey-patties',
        name: 'Котлеты из индейки',
        servings: 3,
        ingredients: [
          { productRef: 'prod-turkey-mince', grams: 450 },
          { productRef: 'prod-onion', grams: 80 }
        ],
        steps: ['Смешать фарш и лук.', 'Сформировать котлеты.', 'Обжарить/запечь.'],
        tags: ['обед']
      },
      {
        id: 'rec-omelet',
        name: 'Омлет 3 яйца + брокколи',
        servings: 1,
        ingredients: [
          { productRef: 'prod-eggs', grams: 150 },
          { productRef: 'prod-broccoli', grams: 100 }
        ],
        steps: ['Взбить яйца.', 'Добавить брокколи.', 'Готовить 6–8 мин.'],
        tags: ['завтрак']
      }
    ],
    rules: [
      {
        id: 'rule-no-delivery',
        name: 'No delivery during S0',
        text: 'В период S0 — без доставки, готовим дома.',
        tags: ['питание']
      },
      {
        id: 'rule-delay-cigarette',
        name: 'Delay first cigarette by 15 minutes',
        text: 'Отложить первую сигарету на 15 минут.',
        tags: ['курение']
      },
      {
        id: 'rule-water-breaths',
        name: 'Before stress cigarette: water + 10 slow breaths',
        text: 'Перед стрессовой сигаретой: вода + 10 медленных вдохов.',
        tags: ['курение']
      }
    ],
    taskTemplates: [
      {
        id: 'tpl-warmup',
        type: 'warmup',
        title: 'Разминка',
        defaultTarget: { minutes: 10 },
        suggestedRefs: [{ kind: 'protocol', refId: 'proto-r10-warmup' }]
      },
      {
        id: 'tpl-movement',
        type: 'movement',
        title: 'Движение',
        defaultTarget: { minutes: 20 }
      },
      {
        id: 'tpl-strength',
        type: 'strength',
        title: 'Силовая',
        defaultTarget: { rounds: 2 },
        suggestedRefs: [{ kind: 'protocol', refId: 'proto-s0-str' }]
      },
      {
        id: 'tpl-nutrition',
        type: 'nutrition',
        title: 'Питание',
        defaultTarget: { meals: 3 },
        suggestedRefs: [{ kind: 'rule', refId: 'rule-no-delivery' }]
      },
      {
        id: 'tpl-smoking',
        type: 'smoking',
        title: 'Курение',
        defaultTarget: { max: 5 },
        suggestedRefs: [
          { kind: 'rule', refId: 'rule-delay-cigarette' },
          { kind: 'rule', refId: 'rule-water-breaths' }
        ]
      },
      {
        id: 'tpl-measurement',
        type: 'measurement',
        title: 'Измерения',
        defaultTarget: { weight: 'kg', waist: 'cm' }
      },
      {
        id: 'tpl-sleep',
        type: 'sleep',
        title: 'Якорь сна',
        defaultTarget: { wake: '07:30' }
      }
    ]
  },
  planner: {
    periods: [
      {
        id: 'period-s0',
        name: 'S0',
        startDate: '2026-01-16',
        endDate: '2026-01-18',
        goals: ['Вернуть базовую активность', 'Стабилизировать сон'],
        notes: 'Черновик периода для старта.'
      }
    ],
    dayPlans: [
      {
        id: 'day-2026-01-16',
        date: '2026-01-16',
        periodId: 'period-s0',
        tasks: [
          {
            id: 'task-16-warmup',
            templateRef: 'tpl-warmup',
            status: 'planned',
            assignedRefs: [{ kind: 'protocol', refId: 'proto-r10-warmup' }]
          },
          {
            id: 'task-16-movement',
            templateRef: 'tpl-movement',
            status: 'planned',
            target: { minutes: 20 }
          },
          {
            id: 'task-16-strength',
            templateRef: 'tpl-strength',
            status: 'planned',
            assignedRefs: [{ kind: 'protocol', refId: 'proto-s0-str' }]
          },
          {
            id: 'task-16-nutrition',
            templateRef: 'tpl-nutrition',
            status: 'planned',
            assignedRefs: [{ kind: 'rule', refId: 'rule-no-delivery' }]
          },
          {
            id: 'task-16-smoking',
            templateRef: 'tpl-smoking',
            status: 'planned',
            assignedRefs: [{ kind: 'rule', refId: 'rule-delay-cigarette' }]
          },
          {
            id: 'task-16-measure',
            templateRef: 'tpl-measurement',
            status: 'planned'
          },
          {
            id: 'task-16-sleep',
            templateRef: 'tpl-sleep',
            status: 'planned'
          }
        ]
      },
      {
        id: 'day-2026-01-17',
        date: '2026-01-17',
        periodId: 'period-s0',
        tasks: [
          {
            id: 'task-17-warmup',
            templateRef: 'tpl-warmup',
            status: 'planned',
            assignedRefs: [{ kind: 'protocol', refId: 'proto-r10-warmup' }]
          },
          {
            id: 'task-17-movement',
            templateRef: 'tpl-movement',
            status: 'planned',
            target: { minutes: 25 }
          },
          {
            id: 'task-17-strength',
            templateRef: 'tpl-strength',
            status: 'planned',
            assignedRefs: [{ kind: 'protocol', refId: 'proto-s0-str' }]
          },
          {
            id: 'task-17-nutrition',
            templateRef: 'tpl-nutrition',
            status: 'planned',
            assignedRefs: [{ kind: 'rule', refId: 'rule-no-delivery' }]
          },
          {
            id: 'task-17-smoking',
            templateRef: 'tpl-smoking',
            status: 'planned',
            assignedRefs: [{ kind: 'rule', refId: 'rule-water-breaths' }]
          },
          {
            id: 'task-17-measure',
            templateRef: 'tpl-measurement',
            status: 'planned'
          },
          {
            id: 'task-17-sleep',
            templateRef: 'tpl-sleep',
            status: 'planned'
          }
        ]
      },
      {
        id: 'day-2026-01-18',
        date: '2026-01-18',
        periodId: 'period-s0',
        tasks: [
          {
            id: 'task-18-warmup',
            templateRef: 'tpl-warmup',
            status: 'planned',
            assignedRefs: [{ kind: 'protocol', refId: 'proto-r10-warmup' }]
          },
          {
            id: 'task-18-movement',
            templateRef: 'tpl-movement',
            status: 'planned',
            target: { minutes: 30 }
          },
          {
            id: 'task-18-strength',
            templateRef: 'tpl-strength',
            status: 'planned',
            assignedRefs: [{ kind: 'protocol', refId: 'proto-s0-str' }]
          },
          {
            id: 'task-18-nutrition',
            templateRef: 'tpl-nutrition',
            status: 'planned',
            assignedRefs: [{ kind: 'rule', refId: 'rule-no-delivery' }]
          },
          {
            id: 'task-18-smoking',
            templateRef: 'tpl-smoking',
            status: 'planned'
          },
          {
            id: 'task-18-measure',
            templateRef: 'tpl-measurement',
            status: 'planned'
          },
          {
            id: 'task-18-sleep',
            templateRef: 'tpl-sleep',
            status: 'planned'
          }
        ]
      }
    ]
  },
  logs: {
    foodDays: [],
    activity: [],
    smoking: [],
    weight: [],
    waist: [],
    sleep: [],
    photos: []
  },
  presets: {
    portions: [
      { label: '1 порция', grams: 200 },
      { label: '1/2 тарелки', grams: 150 },
      { label: '2 котлеты', grams: 220 }
    ]
  }
};
