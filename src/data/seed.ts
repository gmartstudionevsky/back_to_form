import { AppData } from '../types';

export const schemaVersion = 11;

export const seedData: AppData = {
  schemaVersion,
  library: {
    exercises: [
      {
        id: 'ex-chin-tuck',
        name: 'Втягивание подбородка',
        tags: ['шея'],
        steps: ['Сядьте ровно.', 'Мягко втяните подбородок назад.', 'Держите 5–10 секунд.'],
        cues: ['Шея длинная', 'Плечи расслаблены'],
        mistakes: ['Поднятые плечи', 'Резкий рывок'],
        regressions: ['Сделать у стены'],
        progressions: ['Добавить лёгкое сопротивление'],
        activityMetrics: { perMinute: 0.04, base: 0.2 }
      },
      {
        id: 'ex-neck-side-bend',
        name: 'Наклон шеи в сторону',
        tags: ['шея'],
        steps: ['Наклоните голову к плечу.', 'Держите 15–20 секунд.'],
        cues: ['Плечи вниз'],
        mistakes: ['Крутить головой'],
        regressions: ['Меньше амплитуда'],
        progressions: ['Лёгкое давление рукой'],
        activityMetrics: { perMinute: 0.04, base: 0.2 }
      },
      {
        id: 'ex-open-book',
        name: 'Поворот грудного отдела «Книга»',
        tags: ['грудной отдел'],
        steps: ['Лягте на бок.', 'Откройте грудную клетку вверх.', 'Дышите глубоко.'],
        cues: ['Колени вместе'],
        mistakes: ['Отрыв коленей'],
        regressions: ['Меньше амплитуда'],
        progressions: ['Дольше удержание'],
        activityMetrics: { perMinute: 0.04, base: 0.2 }
      },
      {
        id: 'ex-cat-cow',
        name: 'Кошка-корова',
        tags: ['спина'],
        steps: ['Встаньте на четвереньки.', 'Плавно прогибайте и округляйте спину.'],
        cues: ['Движение мягкое'],
        mistakes: ['Задержка дыхания'],
        regressions: ['Сидя на стуле'],
        progressions: ['Добавить паузу'],
        activityMetrics: { perMinute: 0.04, base: 0.2 }
      },
      {
        id: 'ex-hip-flexor',
        name: 'Растяжка сгибателей бедра',
        tags: ['таз'],
        steps: ['Полуколено.', 'Подайте таз вперёд.', 'Держите 20–30 сек.'],
        cues: ['Корпус ровный'],
        mistakes: ['Прогиб в пояснице'],
        regressions: ['Меньше шаг'],
        progressions: ['Поднять руку вверх'],
        activityMetrics: { perMinute: 0.04, base: 0.2 }
      },
      {
        id: 'ex-glute-bridge',
        name: 'Ягодичный мостик',
        tags: ['ягодицы'],
        steps: ['Лёжа на спине.', 'Поднимите таз.', 'Сожмите ягодицы.'],
        cues: ['Рёбра вниз'],
        mistakes: ['Переразгиб'],
        regressions: ['Меньше амплитуда'],
        progressions: ['Одна нога'],
        activityMetrics: { perMinute: 0.04, base: 0.25 }
      },
      {
        id: 'ex-bird-dog',
        name: 'Птица-собака',
        tags: ['стабилизация'],
        steps: ['Рука и нога в линию.', 'Держите 3–5 сек.'],
        cues: ['Таз стабилен'],
        mistakes: ['Провал в пояснице'],
        regressions: ['По отдельности'],
        progressions: ['Дольше удержание'],
        activityMetrics: { perMinute: 0.04, base: 0.25 }
      },
      {
        id: 'ex-ankle-wall',
        name: 'Мобилизация голеностопа у стены',
        tags: ['голеностоп'],
        steps: ['Колено к стене.', 'Пятка на полу.'],
        cues: ['Контроль'],
        mistakes: ['Отрыв пятки'],
        regressions: ['Меньше дистанция'],
        progressions: ['Дальше от стены'],
        activityMetrics: { perMinute: 0.04, base: 0.2 }
      },
      {
        id: 'ex-chair-squat',
        name: 'Присед на короб',
        tags: ['ноги'],
        steps: ['Сядьте на короб.', 'Встаньте без рывка.'],
        cues: ['Колени наружу'],
        mistakes: ['Падение на стул'],
        regressions: ['Выше короб'],
        progressions: ['Без коробки'],
        activityMetrics: { perMinute: 0.05, base: 0.3 }
      },
      {
        id: 'ex-incline-pushup',
        name: 'Отжимания от опоры',
        tags: ['грудь'],
        steps: ['Упритесь в стол или стену.', 'Опускайтесь контролируемо.'],
        cues: ['Корпус прямой'],
        mistakes: ['Прогиб'],
        regressions: ['Выше опора'],
        progressions: ['Ниже опора'],
        activityMetrics: { perMinute: 0.05, base: 0.3 }
      },
      {
        id: 'ex-backpack-row',
        name: 'Тяга рюкзака',
        tags: ['спина'],
        steps: ['Тяните рюкзак к поясу.', 'Пауза вверху.'],
        cues: ['Лопатки назад'],
        mistakes: ['Круглая спина'],
        regressions: ['Лёгкий вес'],
        progressions: ['Тяжелее вес'],
        activityMetrics: { perMinute: 0.05, base: 0.3 }
      },
      {
        id: 'ex-dead-bug',
        name: 'Мёртвый жук',
        tags: ['кор'],
        steps: ['Спина прижата.', 'Плавно опускайте руку/ногу.'],
        cues: ['Поясница на полу'],
        mistakes: ['Прогиб'],
        regressions: ['Только руки'],
        progressions: ['Дольше удержание'],
        activityMetrics: { perMinute: 0.04, base: 0.25 }
      },
      {
        id: 'ex-knee-plank',
        name: 'Планка с колен',
        tags: ['кор'],
        steps: ['Колени на полу.', 'Держите 20–30 сек.'],
        cues: ['Рёбра вниз'],
        mistakes: ['Провис'],
        regressions: ['Меньше время'],
        progressions: ['Полная планка'],
        activityMetrics: { perMinute: 0.04, base: 0.25 }
      },
      {
        id: 'ex-mcgill',
        name: 'Скручивание МакГилла',
        tags: ['кор'],
        steps: ['Одна нога согнута.', 'Небольшой подъём головы и плеч.'],
        cues: ['Шея нейтрально'],
        mistakes: ['Сильный подъём'],
        regressions: ['Меньше время'],
        progressions: ['Дольше удержание'],
        activityMetrics: { perMinute: 0.04, base: 0.25 }
      }
    ],
    protocols: [
      {
        id: 'proto-r10-warmup',
        name: 'Разминка R10',
        description: 'Разминка 10 минут с мягкой мобилизацией.',
        steps: [
          { text: 'Втягивание подбородка', durationSec: 30, exerciseRef: 'ex-chin-tuck' },
          { text: 'Наклон шеи в сторону', durationSec: 60, exerciseRef: 'ex-neck-side-bend' },
          { text: 'Поворот грудного отдела', durationSec: 60, exerciseRef: 'ex-open-book' },
          { text: 'Кошка-корова', durationSec: 60, exerciseRef: 'ex-cat-cow' },
          { text: 'Сгибатели бедра', durationSec: 60, exerciseRef: 'ex-hip-flexor' },
          { text: 'Ягодичный мостик', durationSec: 60, exerciseRef: 'ex-glute-bridge' },
          { text: 'Птица-собака', durationSec: 60, exerciseRef: 'ex-bird-dog' },
          { text: 'Голеностоп у стены', durationSec: 60, exerciseRef: 'ex-ankle-wall' }
        ]
      },
      {
        id: 'proto-s0-str',
        name: 'Силовой круг S0',
        description: 'Круговая тренировка, 2 круга. Контроль темпа, отдых 60 сек.',
        steps: [
          { text: 'Присед на короб x8', exerciseRef: 'ex-chair-squat' },
          { text: 'Отжимания от опоры x8', exerciseRef: 'ex-incline-pushup' },
          { text: 'Тяга рюкзака x10', exerciseRef: 'ex-backpack-row' },
          { text: 'Мёртвый жук x8/стор', exerciseRef: 'ex-dead-bug' },
          { text: 'Планка с колен 20 сек', exerciseRef: 'ex-knee-plank' },
          { text: 'Скручивание МакГилла x6/стор', exerciseRef: 'ex-mcgill' }
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
        nutritionTags: ['snack', 'healthy'],
        portionPresets: [{ label: '1 стакан', grams: 200 }],
        hydrationContribution: true,
        notes: 'Подходит для быстрого перекуса.'
      },
      {
        id: 'prod-cottage',
        name: 'Творог (approx)',
        kcalPer100g: 120,
        proteinPer100g: 16,
        fatPer100g: 5,
        carbPer100g: 3,
        nutritionTags: ['healthy']
      },
      {
        id: 'prod-kefir',
        name: 'Кефир (approx)',
        kcalPer100g: 60,
        proteinPer100g: 3,
        fatPer100g: 3,
        carbPer100g: 4,
        nutritionTags: ['snack', 'healthy'],
        portionPresets: [{ label: '250 мл', grams: 250 }],
        hydrationContribution: true
      },
      {
        id: 'prod-rice',
        name: 'Рис (сухой, approx)',
        kcalPer100g: 360,
        proteinPer100g: 7,
        fatPer100g: 1,
        carbPer100g: 80,
        nutritionTags: ['healthy'],
        portionPresets: [{ label: '50 г сухого', grams: 50 }]
      },
      {
        id: 'prod-buckwheat',
        name: 'Гречка (сухая, approx)',
        kcalPer100g: 340,
        proteinPer100g: 12,
        fatPer100g: 3,
        carbPer100g: 68,
        nutritionTags: ['healthy'],
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
        nutritionTags: ['snack'],
        portionPresets: [{ label: '1 банан', grams: 120 }]
      },
      {
        id: 'prod-apple',
        name: 'Яблоко (approx)',
        kcalPer100g: 52,
        nutritionTags: ['snack', 'healthy'],
        portionPresets: [{ label: '1 яблоко', grams: 150 }],
        hydrationContribution: true
      },
      {
        id: 'prod-oats',
        name: 'Овсянка (сухая, approx)',
        kcalPer100g: 370,
        proteinPer100g: 13,
        fatPer100g: 6,
        carbPer100g: 62,
        nutritionTags: ['healthy'],
        portionPresets: [{ label: '40 г', grams: 40 }],
        notes: 'База для каши или батончиков.'
      },
      {
        id: 'prod-honey',
        name: 'Мёд (approx)',
        kcalPer100g: 304,
        carbPer100g: 82,
        nutritionTags: ['snack'],
        portionPresets: [{ label: '1 ч.л.', grams: 12 }]
      },
      {
        id: 'prod-dark-chocolate',
        name: 'Тёмный шоколад (approx)',
        kcalPer100g: 540,
        fatPer100g: 30,
        carbPer100g: 50,
        nutritionTags: ['cheat', 'snack'],
        portionPresets: [{ label: '20 г', grams: 20 }],
        notes: 'Использовать как читмил.'
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
        steps: ['Смешайте специи.', 'Запекайте 25–30 мин при 200°С.'],
        notes: 'Соль/перец по вкусу.',
        tags: ['ужин'],
        category: 'main',
        nutritionTags: ['healthy']
      },
      {
        id: 'rec-cooked-rice',
        name: 'Рис отварной',
        servings: 3,
        ingredients: [{ productRef: 'prod-rice', grams: 150 }],
        steps: ['Промыть рис.', 'Варить 18–20 мин.'],
        tags: ['гарнир'],
        category: 'side',
        nutritionTags: ['healthy']
      },
      {
        id: 'rec-cooked-buckwheat',
        name: 'Гречка отварная',
        servings: 3,
        ingredients: [{ productRef: 'prod-buckwheat', grams: 180 }],
        steps: ['Промыть гречку.', 'Варить 15–18 мин.'],
        tags: ['гарнир'],
        category: 'side',
        nutritionTags: ['healthy']
      },
      {
        id: 'rec-boiled-potatoes',
        name: 'Картофель отварной',
        servings: 3,
        ingredients: [{ productRef: 'prod-potatoes', grams: 600 }],
        steps: ['Очистить.', 'Варить 20–25 мин.'],
        tags: ['гарнир'],
        category: 'side',
        nutritionTags: ['healthy']
      },
      {
        id: 'rec-salad',
        name: 'Салат огурец + помидор + салат',
        servings: 2,
        ingredients: [
          { productRef: 'prod-cucumber', grams: 200 },
          { productRef: 'prod-tomato', grams: 200 },
          { productRef: 'prod-lettuce', grams: 120 },
          { productRef: 'prod-olive-oil', grams: 10 }
        ],
        steps: ['Нарезать.', 'Смешать.', 'Заправить.'],
        tags: ['салат'],
        category: 'salad',
        nutritionTags: ['healthy']
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
        tags: ['ужин'],
        category: 'main',
        nutritionTags: ['healthy']
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
        tags: ['обед'],
        category: 'main',
        nutritionTags: ['healthy']
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
        tags: ['завтрак'],
        category: 'breakfast',
        nutritionTags: ['healthy']
      },
      {
        id: 'rec-oatmeal',
        name: 'Овсянка с яблоком',
        servings: 1,
        ingredients: [
          { productRef: 'prod-oats', grams: 40 },
          { productRef: 'prod-apple', grams: 80 },
          { productRef: 'prod-honey', grams: 8 }
        ],
        steps: ['Сварить овсянку.', 'Добавить яблоко и мёд.'],
        notes: 'Можно добавить корицу.',
        tags: ['завтрак'],
        category: 'breakfast',
        complexity: 'easy',
        nutritionTags: ['healthy']
      },
      {
        id: 'rec-yogurt-dessert',
        name: 'Творожно-йогуртовый десерт',
        servings: 2,
        ingredients: [
          { productRef: 'prod-greek-yogurt', grams: 200 },
          { productRef: 'prod-cottage', grams: 160 },
          { productRef: 'prod-dark-chocolate', grams: 20 }
        ],
        steps: ['Смешать йогурт и творог.', 'Добавить стружку шоколада.'],
        notes: 'Баланс сладкого и белка.',
        tags: ['перекус', 'десерт'],
        category: 'dessert',
        complexity: 'easy',
        nutritionTags: ['snack', 'cheat']
      },
      {
        id: 'rec-smoothie',
        name: 'Смузи банан + кефир',
        servings: 1,
        ingredients: [
          { productRef: 'prod-banana', grams: 120 },
          { productRef: 'prod-kefir', grams: 200 }
        ],
        steps: ['Смешать в блендере 30 секунд.'],
        tags: ['напиток'],
        category: 'drink',
        complexity: 'easy',
        nutritionTags: ['snack'],
        hydrationContribution: true
      }
    ],
    drinks: [
      {
        id: 'drink-water',
        name: 'Вода',
        hydrationFactor: 1,
        kcalPer100ml: 0,
        proteinPer100ml: 0,
        fatPer100ml: 0,
        carbPer100ml: 0,
        portions: [
          { label: 'Стакан 250 мл', ml: 250 },
          { label: 'Бутылка 500 мл', ml: 500 },
          { label: 'Бутылка 750 мл', ml: 750 }
        ]
      },
      {
        id: 'drink-tea',
        name: 'Чай',
        hydrationFactor: 0.9,
        kcalPer100ml: 0,
        proteinPer100ml: 0,
        fatPer100ml: 0,
        carbPer100ml: 0,
        portions: [
          { label: 'Чашка 200 мл', ml: 200 },
          { label: 'Кружка 300 мл', ml: 300 }
        ]
      },
      {
        id: 'drink-coffee',
        name: 'Кофе',
        hydrationFactor: 0.8,
        kcalPer100ml: 0,
        proteinPer100ml: 0,
        fatPer100ml: 0,
        carbPer100ml: 0,
        portions: [
          { label: 'Эспрессо 60 мл', ml: 60 },
          { label: 'Кружка 200 мл', ml: 200 }
        ]
      }
    ],
    rules: [
      {
        id: 'rule-no-delivery',
        name: 'Без доставки в период S0',
        text: 'В период S0 — без доставки, готовим дома.',
        tags: ['питание']
      },
      {
        id: 'rule-delay-cigarette',
        name: 'Отложить первую сигарету',
        text: 'Отложить первую сигарету на 15 минут.',
        tags: ['курение']
      },
      {
        id: 'rule-water-breaths',
        name: 'Перед стрессовой сигаретой: вода + дыхание',
        text: 'Перед стрессовой сигаретой: вода + 10 медленных вдохов.',
        tags: ['курение']
      }
    ],
    movementActivities: [
      {
        id: 'move-run',
        name: 'Бег',
        kind: 'run',
        activityMetrics: { perMinute: 0.05, perKm: 0.35 }
      },
      {
        id: 'move-march',
        name: 'Ходьба на месте',
        kind: 'march',
        activityMetrics: { perMinute: 0.025, perKm: 0.25, perStep: 0.00008 }
      },
      {
        id: 'move-stairs',
        name: 'Ходьба по лестницам',
        kind: 'stairs',
        activityMetrics: { perMinute: 0.04, perFlight: 0.05 }
      }
    ],
    activityDefaults: {
      workoutPerMinute: 0.04,
      movementPerMinute: 0.03,
      step: 0.00008,
      distanceKm: 0.3,
      set: 0.12,
      rep: 0.01,
      kcal: 0.002,
      flight: 0.05,
      exerciseBase: 0.2
    },
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
            assignedRefs: [{ kind: 'protocol', refId: 'proto-r10-warmup' }],
            target: { minutes: 10 },
            timeOfDay: 'morning',
            notes: 'Разогрев перед силовой.'
          },
          {
            id: 'task-16-nutrition',
            templateRef: 'tpl-nutrition',
            status: 'planned',
            assignedRefs: [{ kind: 'rule', refId: 'rule-no-delivery' }],
            target: { meals: 3 },
            timeOfDay: 'day'
          },
          {
            id: 'task-16-sleep',
            templateRef: 'tpl-sleep',
            status: 'planned',
            target: { wake: '07:30' },
            timeOfDay: 'evening'
          }
        ],
        mealsPlan: {
          breakfast: [
            {
              id: 'plan-16-breakfast-1',
              kind: 'dish',
              refId: 'rec-omelet',
              plannedServings: 1,
              plannedTime: '08:00',
              notes: 'Белок + овощи'
            }
          ],
          lunch: [
            {
              id: 'plan-16-lunch-1',
              kind: 'dish',
              refId: 'rec-turkey-patties',
              plannedServings: 1,
              plannedTime: '13:30'
            },
            {
              id: 'plan-16-lunch-2',
              kind: 'dish',
              refId: 'rec-cooked-buckwheat',
              plannedServings: 1
            }
          ],
          dinner: [
            {
              id: 'plan-16-dinner-1',
              kind: 'dish',
              refId: 'rec-baked-fish',
              plannedServings: 1
            },
            {
              id: 'plan-16-dinner-2',
              kind: 'dish',
              refId: 'rec-salad',
              plannedServings: 1
            }
          ],
          snack: [
            {
              id: 'plan-16-snack-1',
              kind: 'product',
              refId: 'prod-greek-yogurt',
              plannedGrams: 200,
              plannedTime: '16:30',
              notes: 'Перекус после работы.'
            }
          ]
        },
        mealComponents: {
          breakfast: [
            {
              id: 'cmp-16-breakfast-1',
              type: 'main',
              recipeRef: 'rec-omelet',
              portion: '1 порция'
            }
          ],
          lunch: [
            {
              id: 'cmp-16-lunch-1',
              type: 'main',
              recipeRef: 'rec-turkey-patties',
              portion: '1 порция'
            },
            {
              id: 'cmp-16-lunch-2',
              type: 'side',
              recipeRef: 'rec-cooked-buckwheat',
              portion: '1 порция'
            }
          ],
          dinner: [
            {
              id: 'cmp-16-dinner-1',
              type: 'main',
              recipeRef: 'rec-baked-fish',
              portion: '1 порция'
            },
            {
              id: 'cmp-16-dinner-2',
              type: 'salad',
              recipeRef: 'rec-salad',
              portion: '1 порция',
              extra: true
            }
          ],
          snack: [
            {
              id: 'cmp-16-snack-1',
              type: 'snack',
              recipeRef: 'rec-yogurt-dessert',
              portion: '1 порция',
              notes: 'Если нужен сладкий вариант.'
            }
          ]
        },
        mealTimes: {
          breakfast: '08:00',
          lunch: '13:30',
          dinner: '19:00',
          snack: '16:30'
        },
        workoutsPlan: [
          {
            id: 'plan-16-workout-1',
            timeOfDay: 'morning',
            protocolRef: 'proto-r10-warmup',
            isRequired: true,
            kind: 'workout',
            plannedTime: '08:15'
          },
          {
            id: 'plan-16-movement-1',
            timeOfDay: 'day',
            plannedMinutes: 10,
            kind: 'movement',
            movementActivityRef: 'move-march',
            plannedTime: '12:30'
          },
          {
            id: 'plan-16-workout-2',
            timeOfDay: 'evening',
            protocolRef: 'proto-s0-str',
            isRequired: true,
            kind: 'workout',
            plannedTime: '18:30'
          }
        ],
        plannedSteps: 8000,
        activityTargets: {
          steps: 8000,
          trainingMinutes: 30,
          movementMinutes: 15,
          coefficient: 1.1
        },
        nutritionTargets: {
          kcal: 1800,
          protein: 130,
          fat: 60,
          carb: 180,
          meals: 3
        },
        requirements: {
          requireWeight: true,
          requireWaist: false,
          requirePhotos: ['front'],
          smokingTargetMax: 5,
          kcalTarget: 1800,
          sleepWakeTarget: '07:30',
          sleepDurationTargetMinutes: 450
        },
        notes: 'Стартовый день с фокусом на разминку и базовое питание.'
      },
      {
        id: 'day-2026-01-17',
        date: '2026-01-17',
        periodId: 'period-s0',
        tasks: [
          {
            id: 'task-17-strength',
            templateRef: 'tpl-strength',
            status: 'planned',
            assignedRefs: [{ kind: 'protocol', refId: 'proto-s0-str' }],
            target: { rounds: 2 },
            timeOfDay: 'evening'
          },
          {
            id: 'task-17-smoking',
            templateRef: 'tpl-smoking',
            status: 'planned',
            assignedRefs: [
              { kind: 'rule', refId: 'rule-delay-cigarette' },
              { kind: 'rule', refId: 'rule-water-breaths' }
            ],
            target: { max: 5 },
            timeOfDay: 'day'
          }
        ],
        mealsPlan: {
          breakfast: [
            {
              id: 'plan-17-breakfast-1',
              kind: 'dish',
              refId: 'rec-omelet',
              plannedServings: 1,
              plannedTime: '08:10'
            }
          ],
          lunch: [
            {
              id: 'plan-17-lunch-1',
              kind: 'dish',
              refId: 'rec-baked-chicken',
              plannedServings: 1,
              plannedTime: '13:20'
            },
            {
              id: 'plan-17-lunch-2',
              kind: 'dish',
              refId: 'rec-cooked-rice',
              plannedServings: 1
            }
          ],
          dinner: [
            {
              id: 'plan-17-dinner-1',
              kind: 'dish',
              refId: 'rec-baked-fish',
              plannedServings: 1
            },
            {
              id: 'plan-17-dinner-2',
              kind: 'dish',
              refId: 'rec-salad',
              plannedServings: 1,
              plannedTime: '19:00'
            }
          ],
          snack: [
            {
              id: 'plan-17-snack-1',
              kind: 'free',
              title: 'Фруктовый перекус',
              plannedKcal: 180,
              plannedProtein: 3,
              plannedFat: 1,
              plannedCarb: 40,
              plannedTime: '16:00',
              notes: 'Выбрать сезонный фрукт.'
            }
          ]
        },
        mealComponents: {
          breakfast: [
            {
              id: 'cmp-17-breakfast-1',
              type: 'main',
              recipeRef: 'rec-omelet',
              portion: '1 порция'
            }
          ],
          lunch: [
            {
              id: 'cmp-17-lunch-1',
              type: 'main',
              recipeRef: 'rec-baked-chicken',
              portion: '1 порция'
            },
            {
              id: 'cmp-17-lunch-2',
              type: 'side',
              recipeRef: 'rec-cooked-rice',
              portion: '1 порция'
            }
          ],
          dinner: [
            {
              id: 'cmp-17-dinner-1',
              type: 'main',
              recipeRef: 'rec-baked-fish',
              portion: '1 порция'
            },
            {
              id: 'cmp-17-dinner-2',
              type: 'salad',
              recipeRef: 'rec-salad',
              portion: '1 порция'
            }
          ],
          snack: [
            {
              id: 'cmp-17-snack-1',
              type: 'snack',
              portion: '1 порция',
              notes: 'Свободный вариант.'
            }
          ]
        },
        mealTimes: {
          breakfast: '08:10',
          lunch: '13:20',
          dinner: '19:00',
          snack: '16:00'
        },
        workoutsPlan: [
          {
            id: 'plan-17-workout-1',
            timeOfDay: 'morning',
            protocolRef: 'proto-r10-warmup',
            isRequired: true,
            kind: 'workout',
            plannedTime: '08:30'
          },
          {
            id: 'plan-17-movement-1',
            timeOfDay: 'day',
            plannedMinutes: 15,
            kind: 'movement',
            movementActivityRef: 'move-stairs',
            plannedTime: '12:40'
          },
          {
            id: 'plan-17-workout-2',
            timeOfDay: 'evening',
            protocolRef: 'proto-s0-str',
            isRequired: true,
            kind: 'workout',
            plannedTime: '18:40'
          }
        ],
        plannedSteps: 9000,
        activityTargets: {
          steps: 9000,
          trainingMinutes: 35,
          movementMinutes: 20,
          coefficient: 1.15
        },
        nutritionTargets: {
          kcal: 1800,
          protein: 130,
          fat: 60,
          carb: 180,
          meals: 3
        },
        requirements: {
          requireWeight: false,
          requireWaist: true,
          requirePhotos: ['front', 'side'],
          smokingTargetMax: 5,
          kcalTarget: 1800,
          sleepWakeTarget: '07:30',
          sleepDurationTargetMinutes: 450
        },
        notes: 'Добавлен свободный перекус и тренировка лестницы.'
      },
      {
        id: 'day-2026-01-18',
        date: '2026-01-18',
        periodId: 'period-s0',
        tasks: [
          {
            id: 'task-18-measure',
            templateRef: 'tpl-measurement',
            status: 'planned',
            target: { weight: 'kg', waist: 'cm' },
            timeOfDay: 'morning'
          },
          {
            id: 'task-18-move',
            templateRef: 'tpl-movement',
            status: 'planned',
            target: { minutes: 20 },
            timeOfDay: 'day'
          }
        ],
        mealsPlan: {
          breakfast: [
            {
              id: 'plan-18-breakfast-1',
              kind: 'product',
              refId: 'prod-eggs',
              plannedGrams: 150,
              plannedTime: '08:15',
              notes: 'Варёные яйца.'
            }
          ],
          lunch: [
            {
              id: 'plan-18-lunch-1',
              kind: 'dish',
              refId: 'rec-turkey-patties',
              plannedServings: 1,
              plannedTime: '13:00'
            },
            {
              id: 'plan-18-lunch-2',
              kind: 'dish',
              refId: 'rec-cooked-buckwheat',
              plannedServings: 1
            }
          ],
          dinner: [
            {
              id: 'plan-18-dinner-1',
              kind: 'dish',
              refId: 'rec-baked-chicken',
              plannedServings: 1
            },
            {
              id: 'plan-18-dinner-2',
              kind: 'dish',
              refId: 'rec-salad',
              plannedServings: 1,
              plannedTime: '19:10'
            }
          ],
          snack: [
            {
              id: 'plan-18-snack-1',
              kind: 'product',
              refId: 'prod-apple',
              plannedGrams: 150,
              plannedTime: '16:10'
            },
            {
              id: 'plan-18-snack-2',
              kind: 'cheat',
              title: 'Тёмный шоколад',
              plannedKcal: 110,
              plannedProtein: 2,
              plannedFat: 8,
              plannedCarb: 10,
              cheatCategory: 'sweets',
              nutritionTags: ['cheat', 'snack'],
              plannedTime: '20:30'
            }
          ]
        },
        mealComponents: {
          breakfast: [
            {
              id: 'cmp-18-breakfast-1',
              type: 'main',
              portion: '2 яйца'
            }
          ],
          lunch: [
            {
              id: 'cmp-18-lunch-1',
              type: 'main',
              recipeRef: 'rec-turkey-patties',
              portion: '1 порция'
            },
            {
              id: 'cmp-18-lunch-2',
              type: 'side',
              recipeRef: 'rec-cooked-buckwheat',
              portion: '1 порция'
            }
          ],
          dinner: [
            {
              id: 'cmp-18-dinner-1',
              type: 'main',
              recipeRef: 'rec-baked-chicken',
              portion: '1 порция'
            },
            {
              id: 'cmp-18-dinner-2',
              type: 'drink',
              recipeRef: 'rec-smoothie',
              portion: '250 мл'
            }
          ],
          snack: [
            {
              id: 'cmp-18-snack-1',
              type: 'dessert',
              recipeRef: 'rec-yogurt-dessert',
              portion: '1 порция',
              extra: true
            }
          ]
        },
        mealTimes: {
          breakfast: '08:15',
          lunch: '13:00',
          dinner: '19:10',
          snack: '16:10'
        },
        workoutsPlan: [
          {
            id: 'plan-18-workout-1',
            timeOfDay: 'morning',
            protocolRef: 'proto-r10-warmup',
            isRequired: true,
            kind: 'workout',
            plannedTime: '08:40'
          },
          {
            id: 'plan-18-movement-1',
            timeOfDay: 'day',
            plannedMinutes: 20,
            kind: 'movement',
            movementActivityRef: 'move-run',
            plannedTime: '12:30'
          }
        ],
        plannedSteps: 7000,
        activityTargets: {
          steps: 7000,
          movementMinutes: 20,
          distanceKm: 3,
          coefficient: 1
        },
        nutritionTargets: {
          kcal: 1750,
          protein: 125,
          fat: 55,
          carb: 170,
          meals: 3
        },
        requirements: {
          requireWeight: false,
          requireWaist: false,
          requirePhotos: [],
          smokingTargetMax: 4,
          kcalTarget: 1750,
          sleepWakeTarget: '07:00',
          sleepDurationTargetMinutes: 435
        },
        notes: 'День с измерениями и читмилом.'
      }
    ]
  },
  logs: {
    foodDays: [],
    training: [],
    movementSessions: [],
    movementDays: [],
    smoking: [],
    water: [],
    drinks: [],
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
