"""Стартовое наполнение сайта из презентации MEMOR GROUP и папок с фото объектов.

Русские тексты — из презентации (с правкой опечаток). Узбекский и английский переводы
подготовлены при разработке и требуют вычитки носителем языка.
Координаты объектов приблизительные — уточняются в админке.

Фото: ("f", путь в папке материалов) или ("d", имя картинки внутри .pptx).
Этап: render — проект/визуализация, construction — стройка, finished — результат, "" — без метки.
"""

SITE = {
    "company_name": "MEMOR GROUP",
    "legal_name": {"ru": "ООО «MEMOR GROUP»", "uz": "«MEMOR GROUP» MChJ", "en": "MEMOR GROUP LLC"},
    "tagline": {
        "ru": "Строительство полного цикла с 1996 года",
        "uz": "1996-yildan buyon to'liq siklli qurilish",
        "en": "Full-cycle construction since 1996",
    },
    "hero_title": {
        "ru": "Строим объекты, которые становятся *визитной карточкой* города",
        "uz": "Shahar *qiyofasini belgilaydigan* obyektlarni quramiz",
        "en": "We build *landmarks* that define the city",
    },
    "hero_text": {
        "ru": "Полный цикл: от проектирования и строительно-монтажных работ до ввода объекта в эксплуатацию.",
        "uz": "To'liq sikl: loyihalashdan va qurilish-montaj ishlaridan obyektni foydalanishga topshirishgacha.",
        "en": "Full cycle: from design and construction works to commissioning.",
    },
    "founded_year": 1996,
    "companies_count": 10,
    "employees_count": 200,
    "about_short": {
        "ru": "ООО «MEMOR GROUP» — группа компаний, специализирующаяся на всех этапах строительства: "
              "от проектирования и строительно-монтажных работ до тестирования и ввода объектов в эксплуатацию.",
        "uz": "«MEMOR GROUP» MChJ — qurilishning barcha bosqichlariga ixtisoslashgan kompaniyalar guruhi: "
              "loyihalash va qurilish-montaj ishlaridan tortib sinovdan o'tkazish va obyektlarni foydalanishga "
              "topshirishgacha.",
        "en": "MEMOR GROUP LLC is a group of companies covering every stage of construction: from design and "
              "construction works to testing and commissioning.",
    },
    "letter_title": {"ru": "Уважаемые господа!", "uz": "Hurmatli hamkorlar!", "en": "Dear partners,"},
    "letter_text": {
        "ru": "ООО «MEMOR» — команда, объединившая высококлассных профессионалов, которые постоянно ищут новые "
              "идеи и совершенствуют своё мастерство. Начав работу в 1996 году, наша группа объединила более "
              "10 компаний и более 200 специалистов в области архитектуры и строительства, а также ландшафтного "
              "дизайна, гостиничных услуг и ретейла.\n\n"
              "Здания, построенные нами по индивидуальным проектам, украшают столицу и стали её визитной "
              "карточкой. Наши основные клиенты — государственные учреждения, девелоперские компании, отели, "
              "санатории, рестораны, кафе, банки, коммерческие компании и ретейл.\n\n"
              "Мы стремимся быть лучшими в своей области, поэтому работаем с профессиональными дизайнерами "
              "и архитекторами, а в проектах используем материалы только самого высокого качества — для "
              "неповторимых и уникальных решений.",
        "uz": "«MEMOR» MChJ — doimo yangi g'oyalar izlayotgan va mahoratini oshirib borayotgan yuqori malakali "
              "mutaxassislarni birlashtirgan jamoa. 1996-yilda faoliyat boshlagan guruhimiz arxitektura va "
              "qurilish, shuningdek landshaft dizayni, mehmonxona xizmatlari va riteyl sohalarida 10 dan ortiq "
              "kompaniya va 200 dan ortiq mutaxassisni birlashtirdi.\n\n"
              "Biz individual loyihalar asosida qurgan binolar poytaxtimizni bezab, uning tashrif qog'oziga "
              "aylandi. Asosiy mijozlarimiz — davlat muassasalari, developerlik kompaniyalari, mehmonxonalar, "
              "sanatoriylar, restoranlar, kafelar, banklar, tijorat kompaniyalari va riteyl.\n\n"
              "Biz o'z sohamizda eng yaxshisi bo'lishga intilamiz, shuning uchun professional dizaynerlar va "
              "arxitektorlar bilan ishlaymiz, loyihalarimizda esa faqat eng yuqori sifatli materiallardan "
              "foydalanamiz.",
        "en": "MEMOR is a team of highly skilled professionals who keep looking for new ideas and keep improving "
              "their craft. Since starting in 1996, our group has brought together more than 10 companies and "
              "over 200 specialists in architecture and construction, as well as landscape design, hospitality "
              "and retail.\n\n"
              "Buildings we have built to bespoke designs grace the capital and have become its landmarks. "
              "Our main clients are government institutions, developers, hotels, sanatoriums, restaurants, "
              "cafés, banks, commercial companies and retailers.\n\n"
              "We strive to be the best in our field, so we work with professional designers and architects and "
              "use only the highest-quality materials to create distinctive, one-of-a-kind solutions.",
    },
    "clients": {
        "ru": "Государственные учреждения, девелоперы, отели и санатории, банки, рестораны, коммерческие компании, ретейл",
        "uz": "Davlat muassasalari, developerlar, mehmonxona va sanatoriylar, banklar, restoranlar, tijorat kompaniyalari, riteyl",
        "en": "Government institutions, developers, hotels and sanatoriums, banks, restaurants, commercial companies, retail",
    },
    "phones": ["+998 97 425 77 77", "+998 90 392 19 05"],
    "email": "ooomemor.uz@gmail.com",
    "address": {
        "ru": "г. Ташкент, Мирзо-Улугбекский район, 1-й проезд Аккурган, 60",
        "uz": "Toshkent sh., Mirzo Ulug'bek tumani, Oqqo'rg'on 1-tor ko'chasi, 60-uy",
        "en": "60, 1st Akkurgan passage, Mirzo-Ulugbek district, Tashkent",
    },
    "working_hours": {"ru": "Пн–Сб, 9:00–18:00", "uz": "Du–Sh, 9:00–18:00", "en": "Mon–Sat, 9:00–18:00"},
    "lat": 41.3262,
    "lng": 69.2958,
    "seo_title": {
        "ru": "MEMOR GROUP — строительная компания в Ташкенте",
        "uz": "MEMOR GROUP — Toshkentdagi qurilish kompaniyasi",
        "en": "MEMOR GROUP — construction company in Tashkent",
    },
    "seo_description": {
        "ru": "Генеральный подряд, проектирование, строительно-монтажные, фасадные и отделочные работы. "
              "Государственные и коммерческие объекты в Узбекистане с 1996 года.",
        "uz": "Bosh pudrat, loyihalash, qurilish-montaj, fasad va pardozlash ishlari. 1996-yildan buyon "
              "O'zbekistondagi davlat va tijorat obyektlari.",
        "en": "General contracting, design, construction, facade and finishing works. Public and commercial "
              "projects in Uzbekistan since 1996.",
    },
}

CITIES = [
    ("tashkent", {"ru": "Ташкент", "uz": "Toshkent", "en": "Tashkent"}),
    ("tashkent-region", {"ru": "Ташкентская область", "uz": "Toshkent viloyati", "en": "Tashkent region"}),
    ("kokand", {"ru": "Коканд", "uz": "Qo'qon", "en": "Kokand"}),
    ("bukhara", {"ru": "Бухара", "uz": "Buxoro", "en": "Bukhara"}),
]

TYPES = [
    ("residential", {"ru": "Жильё", "uz": "Turar-joy", "en": "Residential"}),
    ("offices", {"ru": "Банки и офисы", "uz": "Banklar va ofislar", "en": "Banks and offices"}),
    ("education", {"ru": "Образование", "uz": "Ta'lim", "en": "Education"}),
    ("healthcare", {"ru": "Медицина", "uz": "Tibbiyot", "en": "Healthcare"}),
    ("public", {"ru": "Общественные и культурные", "uz": "Jamoat va madaniyat", "en": "Public and cultural"}),
    ("hospitality", {"ru": "Гостиницы", "uz": "Mehmonxonalar", "en": "Hotels"}),
    ("industrial", {"ru": "Промышленность", "uz": "Sanoat", "en": "Industrial"}),
    ("infrastructure", {"ru": "Инфраструктура", "uz": "Infratuzilma", "en": "Infrastructure"}),
]

SERVICES = [
    {
        "slug": "architectural-design", "icon": "design",
        "title": {"ru": "Архитектурное проектирование", "uz": "Arxitektura loyihalash", "en": "Architectural design"},
        "short": {
            "ru": "Концепция, эскизный и рабочий проект здания с учётом норм и бюджета.",
            "uz": "Me'yorlar va byudjetni hisobga olgan holda konsepsiya, eskiz va ishchi loyiha.",
            "en": "Concept, schematic and working design that fit regulations and budget.",
        },
        "description": {
            "ru": "Разрабатываем архитектурные решения для жилых, общественных и коммерческих зданий: от концепции "
                  "и визуализаций до рабочей документации. Работаем вместе с конструкторами и инженерами, чтобы "
                  "проект был реализуем и укладывался в бюджет.",
            "uz": "Turar-joy, jamoat va tijorat binolari uchun arxitektura yechimlarini ishlab chiqamiz: "
                  "konsepsiya va vizualizatsiyalardan ishchi hujjatlargacha. Loyiha amalga oshiriladigan va "
                  "byudjetga mos bo'lishi uchun konstruktorlar va muhandislar bilan birga ishlaymiz.",
            "en": "We develop architectural solutions for residential, public and commercial buildings, from concept "
                  "and visualisations to working documentation, together with structural and MEP engineers so the "
                  "design is buildable and on budget.",
        },
    },
    {
        "slug": "construction", "icon": "crane",
        "title": {"ru": "Строительно-монтажные работы", "uz": "Qurilish-montaj ishlari", "en": "Construction works"},
        "short": {
            "ru": "Монолитные и сборные конструкции, каркас, кладка, кровля.",
            "uz": "Monolit va yig'ma konstruksiyalar, karkas, devor terish, tom.",
            "en": "Cast-in-place and precast structures, frames, masonry, roofing.",
        },
        "description": {
            "ru": "Выполняем общестроительные работы как генеральный подрядчик: фундаменты, монолитный и сборный "
                  "железобетон, металлоконструкции, кладку и кровлю. Ведём исполнительную документацию и сдаём "
                  "объект комиссии.",
            "uz": "Bosh pudratchi sifatida umumqurilish ishlarini bajaramiz: poydevor, monolit va yig'ma temir-beton, "
                  "metall konstruksiyalar, devor terish va tom. Ijro hujjatlarini yuritamiz va obyektni "
                  "komissiyaga topshiramiz.",
            "en": "As general contractor we deliver foundations, cast-in-place and precast concrete, steel structures, "
                  "masonry and roofing, keep as-built documentation and hand the building over to the commission.",
        },
    },
    {
        "slug": "earthworks-roads", "icon": "excavator",
        "title": {"ru": "Земляные и дорожные работы", "uz": "Yer va yo'l ishlari", "en": "Earthworks and roads"},
        "short": {
            "ru": "Котлованы, планировка, основания, асфальтирование и благоустройство дорог.",
            "uz": "Kotlovanlar, tekislash, asoslar, asfalt yotqizish.",
            "en": "Excavation, grading, sub-base, asphalt paving.",
        },
        "description": {
            "ru": "Своя спецтехника позволяет быстро выполнить разработку котлованов, вертикальную планировку, "
                  "устройство оснований, асфальтирование проездов и площадок.",
            "uz": "O'z maxsus texnikamiz kotlovan qazish, vertikal tekislash, asos qurish, yo'l va maydonlarni "
                  "asfaltlash ishlarini tez bajarishga imkon beradi.",
            "en": "Our own heavy equipment lets us move fast on excavation, grading, sub-base preparation and asphalt "
                  "paving of driveways and yards.",
        },
    },
    {
        "slug": "engineering-networks", "icon": "network",
        "title": {
            "ru": "Инженерные сети",
            "uz": "Muhandislik tarmoqlari",
            "en": "Utility networks",
        },
        "short": {
            "ru": "Проектирование и прокладка водопровода, канализации, отопления, электросетей.",
            "uz": "Suv, kanalizatsiya, isitish va elektr tarmoqlarini loyihalash va yotqizish.",
            "en": "Design and installation of water, sewer, heating and power networks.",
        },
        "description": {
            "ru": "Проектируем и прокладываем внутренние и наружные инженерные сети: водоснабжение и канализацию, "
                  "отопление и вентиляцию, электроснабжение и слаботочные системы. Устанавливаем солнечные "
                  "водонагреватели и панели.",
            "uz": "Ichki va tashqi muhandislik tarmoqlarini loyihalaymiz va yotqizamiz: suv ta'minoti va kanalizatsiya, "
                  "isitish va ventilyatsiya, elektr ta'minoti va kam quvvatli tizimlar. Quyosh suv isitgichlari va "
                  "panellarini o'rnatamiz.",
            "en": "We design and install internal and external utilities: water supply and sewerage, heating and "
                  "ventilation, power and low-voltage systems, including solar water heaters and panels.",
        },
    },
    {
        "slug": "interior-finishing", "icon": "roller",
        "title": {"ru": "Внутренние отделочные работы", "uz": "Ichki pardozlash ishlari", "en": "Interior finishing"},
        "short": {
            "ru": "Черновая и чистовая отделка, общественные интерьеры, офисы, залы.",
            "uz": "Qora va toza pardozlash, jamoat interyerlari, ofislar, zallar.",
            "en": "Rough and final finishing, public interiors, offices, halls.",
        },
        "description": {
            "ru": "Выполняем отделку квартир, офисов, конференц-залов, учебных и медицинских помещений: "
                  "от выравнивания стен и стяжки до чистовых покрытий, потолков и встроенной мебели.",
            "uz": "Kvartiralar, ofislar, konferens-zallar, o'quv va tibbiyot xonalarini pardozlaymiz: devorlarni "
                  "tekislashdan toza qoplamalar, shiftlar va o'rnatilgan mebelgacha.",
            "en": "We finish apartments, offices, conference halls, classrooms and medical spaces, from wall levelling "
                  "and screeds to final coatings, ceilings and built-in furniture.",
        },
    },
    {
        "slug": "facade", "icon": "facade",
        "title": {"ru": "Внешние фасадные работы", "uz": "Tashqi fasad ishlari", "en": "Facade works"},
        "short": {
            "ru": "Вентилируемые и светопрозрачные фасады, облицовка, утепление.",
            "uz": "Ventilyatsiyalanadigan va shaffof fasadlar, qoplama, issiqlik izolyatsiyasi.",
            "en": "Ventilated and glazed facades, cladding, insulation.",
        },
        "description": {
            "ru": "Монтируем вентилируемые и светопрозрачные фасады, облицовку натуральным и искусственным камнем, "
                  "декоративные элементы в национальном стиле, утепление и окраску.",
            "uz": "Ventilyatsiyalanadigan va shaffof fasadlar, tabiiy va sun'iy tosh qoplamasi, milliy uslubdagi "
                  "dekorativ elementlar, issiqlik izolyatsiyasi va bo'yash ishlarini bajaramiz.",
            "en": "We install ventilated and glazed facades, natural and engineered stone cladding, decorative elements "
                  "in national style, insulation and painting.",
        },
    },
    {
        "slug": "landscaping", "icon": "tree",
        "title": {
            "ru": "Ландшафт и благоустройство",
            "uz": "Landshaft va obodonlashtirish",
            "en": "Landscaping",
        },
        "short": {
            "ru": "Парки, набережные, дворы, озеленение, малые архитектурные формы.",
            "uz": "Bog'lar, sohil bo'yi, hovlilar, ko'kalamzorlashtirish, kichik arxitektura shakllari.",
            "en": "Parks, embankments, courtyards, planting, street furniture.",
        },
        "description": {
            "ru": "Благоустраиваем территории: мощение, озеленение, освещение, фонтаны, детские и спортивные "
                  "площадки, малые архитектурные формы. Пример — реконструкция канала «Кичкирик» в Ташкенте.",
            "uz": "Hududlarni obodonlashtiramiz: yo'lak qoplamasi, ko'kalamzorlashtirish, yoritish, favvoralar, "
                  "bolalar va sport maydonchalari, kichik arxitektura shakllari. Misol — Toshkentdagi "
                  "«Kichkiriq» kanalini rekonstruksiya qilish.",
            "en": "We landscape sites with paving, planting, lighting, fountains, playgrounds and street furniture — "
                  "for example, the reconstruction of the Kichkirik canal in Tashkent.",
        },
    },
]

ADVANTAGES = [
    ({"ru": "Выполняем большие объёмы работ", "uz": "Katta hajmdagi ishlarni bajaramiz",
      "en": "We take on large volumes"},
     {"ru": "Более 200 специалистов и собственный парк спецтехники.",
      "uz": "200 dan ortiq mutaxassis va o'z maxsus texnika parkimiz.",
      "en": "Over 200 specialists and our own fleet of heavy equipment."}),
    ({"ru": "Работаем в сложных условиях", "uz": "Murakkab sharoitlarda ishlaymiz",
      "en": "We work in difficult conditions"},
     {"ru": "Плотная городская застройка, реконструкция и действующие объекты.",
      "uz": "Zich shahar qurilishi, rekonstruksiya va ishlab turgan obyektlar.",
      "en": "Dense urban sites, reconstruction and buildings in operation."}),
    ({"ru": "Готовим исполнительную документацию", "uz": "Ijro hujjatlarini tayyorlaymiz",
      "en": "We prepare as-built documentation"},
     {"ru": "Полный комплект документов для сдачи объекта.",
      "uz": "Obyektni topshirish uchun to'liq hujjatlar to'plami.",
      "en": "A complete document package for handover."}),
    ({"ru": "Учитываем требования стандартов качества", "uz": "Sifat standartlariga rioya qilamiz",
      "en": "We follow quality standards"},
     {"ru": "Строим по действующим нормам и стандартам ISO.",
      "uz": "Amaldagi me'yorlar va ISO standartlari bo'yicha quramiz.",
      "en": "We build to current codes and ISO standards."}),
    ({"ru": "Соблюдаем сроки реализации", "uz": "Muddatlarga rioya qilamiz", "en": "We meet deadlines"},
     {"ru": "Планируем работы и отвечаем за график.",
      "uz": "Ishlarni rejalashtiramiz va jadval uchun javob beramiz.",
      "en": "We plan the work and own the schedule."}),
    ({"ru": "Помогаем рационально использовать бюджет", "uz": "Byudjetdan oqilona foydalanishga yordam beramiz",
      "en": "We help spend the budget wisely"},
     {"ru": "Подбираем решения и материалы под задачу и смету.",
      "uz": "Vazifa va smetaga mos yechim va materiallarni tanlaymiz.",
      "en": "We choose solutions and materials that fit the brief and estimate."}),
]

EQUIPMENT = [
    ("image4.jpg", {"ru": "Экскаватор", "uz": "Ekskavator", "en": "Excavator"}),
    ("image5.jpg", {"ru": "Автокран", "uz": "Avtokran", "en": "Mobile crane"}),
    ("image6.jpg", {"ru": "Самосвал", "uz": "Samosval", "en": "Dump truck"}),
    ("image7.jpg", {"ru": "Каток", "uz": "Katok", "en": "Road roller"}),
    ("image8.jpg", {"ru": "Бульдозер", "uz": "Buldozer", "en": "Bulldozer"}),
    ("image9.jpg", {"ru": "Башенный кран", "uz": "Minorali kran", "en": "Tower crane"}),
    ("image10.jpg", {"ru": "Погрузчик", "uz": "Yuklagich", "en": "Loader"}),
    ("image11.jpg", {"ru": "Асфальтоукладчик", "uz": "Asfalt yotqizgich", "en": "Asphalt paver"}),
]

DOCUMENTS = [
    {
        "image": "image116.jpeg", "kind": "certificate", "valid_until": "2026-07-24",
        "title": {"ru": "Сертификаты ISO 9001:2015 и ISO 45001:2018 (выданы ООО «SHIAS»)",
                  "uz": "ISO 9001:2015 va ISO 45001:2018 sertifikatlari («SHIAS» MChJ)",
                  "en": "ISO 9001:2015 and ISO 45001:2018 certificates (issued to SHIAS LLC)"},
    },
    {
        "image": "image118.png", "kind": "certificate", "valid_until": "2026-06-26",
        "title": {"ru": "Сертификат соответствия O'z DSt ISO 9001, 14001, 45001 (ООО «SHIAS»)",
                  "uz": "O'z DSt ISO 9001, 14001, 45001 muvofiqlik sertifikati («SHIAS» MChJ)",
                  "en": "O'z DSt ISO 9001, 14001, 45001 conformity certificate (SHIAS LLC)"},
    },
    {
        "image": "image117.jpeg", "kind": "license", "valid_until": None,
        "title": {"ru": "Лицензии (оформлены на ООО «SHIAS»)", "uz": "Litsenziyalar («SHIAS» MChJ)",
                  "en": "Licences (issued to SHIAS LLC)"},
    },
]

ISLAMIC = "Центр исламской цивилизации Гостиница Бухара"
REHAB = "Республиканский детский реабилитационний центр"
MATBU = "Матбуотчилар уйи"
SCHOOL = "Школа № 358"

T = {"ru": "Ташкент", "uz": "Toshkent", "en": "Tashkent"}


def _addr(ru: str, uz: str, en: str) -> dict:
    return {"ru": ru, "uz": uz, "en": en}


PROJECTS = [
    {
        "slug": "dynasty",
        "title": {"ru": "ЖК «Династия»", "uz": "«Dinastiya» turar-joy majmuasi", "en": "Dynasty residential complex"},
        "kicker": {"ru": "Жилой комплекс", "uz": "Turar-joy majmuasi", "en": "Residential complex"},
        "sector": "commercial", "type": "residential", "city": "tashkent", "role": "general",
        "status": "in_progress", "featured": True,
        "address": _addr("г. Ташкент, ул. Паркент, 2", "Toshkent sh., Parkent ko'chasi, 2", "2 Parkent St, Tashkent"),
        "lat": 41.3195, "lng": 69.3015,
        "description": {
            "ru": "Многоквартирный жилой комплекс с торговой галереей на первых этажах. MEMOR GROUP — генеральный подрядчик.",
            "uz": "Birinchi qavatlarida savdo galereyasi bo'lgan ko'p xonadonli turar-joy majmuasi. MEMOR GROUP — bosh pudratchi.",
            "en": "A multi-apartment complex with a retail gallery on the lower floors. MEMOR GROUP is the general contractor.",
        },
        "services": ["construction", "engineering-networks", "facade", "interior-finishing", "earthworks-roads"],
        "photos": [
            ("render", [("f", f"{SCHOOL}/photo_2025-05-01_10-53-20.jpg"), ("f", f"{SCHOOL}/photo_2025-05-01_10-53-21 (2).jpg"),
                        ("f", f"{SCHOOL}/photo_2025-05-01_10-53-21 (3).jpg"), ("f", f"{SCHOOL}/photo_2025-05-01_10-53-21.jpg")]),
            ("construction", [("dir", "Династия")]),
        ],
    },
    {
        "slug": "bukhara-hotel-islamic-civilization-center",
        "title": {"ru": "Гостиница «Бухара» у Центра исламской цивилизации",
                  "uz": "Islom sivilizatsiyasi markazi yonidagi «Buxoro» mehmonxonasi",
                  "en": "Bukhara Hotel at the Islamic Civilization Center"},
        "kicker": {"ru": "Общественно-культурный объект", "uz": "Jamoat-madaniy obyekt", "en": "Public and cultural project"},
        "sector": "state", "type": "hospitality", "city": "tashkent", "role": "general",
        "status": "in_progress", "featured": True,
        "address": _addr("г. Ташкент, Алмазарский район", "Toshkent sh., Olmazor tumani", "Almazar district, Tashkent"),
        "lat": 41.3385, "lng": 69.2405,
        "description": {
            "ru": "Комплекс зданий в традиционной архитектуре с арками, резными балконами и майоликой рядом с Центром "
                  "исламской цивилизации.",
            "uz": "Islom sivilizatsiyasi markazi yonida arkalar, o'ymakor ayvonlar va mayolika bilan bezatilgan an'anaviy "
                  "me'morchilikdagi binolar majmuasi.",
            "en": "A group of buildings in traditional architecture — arches, carved balconies and majolica — next to the "
                  "Islamic Civilization Center.",
        },
        "services": ["construction", "facade", "engineering-networks", "interior-finishing"],
        "photos": [
            ("render", [("f", f"{ISLAMIC}/photo_2025-05-01_11-34-40 (3).jpg"), ("glob", f"{ISLAMIC}/photo_*")]),
            ("construction", [("f", f"{ISLAMIC}/IMG_6481.jpg"), ("f", f"{ISLAMIC}/IMG_6475.jpg"), ("f", f"{ISLAMIC}/IMG_6477.jpg"),
                              ("f", f"{ISLAMIC}/IMG_6478.jpg"), ("f", f"{ISLAMIC}/IMG_6476.jpg")]),
        ],
    },
    {
        "slug": "parking-complex-fargona-yuli",
        "title": {"ru": "Многофункциональный 6-уровневый паркинг",
                  "uz": "Ko'p funksiyali 6 qavatli avtoturargoh",
                  "en": "Six-level multifunctional parking complex"},
        "kicker": {"ru": "Паркинг", "uz": "Avtoturargoh", "en": "Parking complex"},
        "sector": "commercial", "type": "infrastructure", "city": "tashkent", "role": "general",
        "status": "completed", "featured": True,
        "address": _addr("г. Ташкент, Мирабадский район, ул. Фаргона йули, 50, корпус 1",
                         "Toshkent sh., Mirobod tumani, Farg'ona yo'li ko'chasi, 50, 1-bino",
                         "50 Fargona Yuli St, bldg 1, Mirabad district, Tashkent"),
        "lat": 41.2925, "lng": 69.3010,
        "description": {
            "ru": "Шестиуровневый паркинг с коммерческими помещениями: монолитный каркас, пандусы, разметка, фасад "
                  "из керамических панелей.",
            "uz": "Tijorat xonalari bo'lgan olti qavatli avtoturargoh: monolit karkas, pandus, belgilash, keramik "
                  "panelli fasad.",
            "en": "A six-level car park with commercial units: cast-in-place frame, ramps, road markings and a ceramic "
                  "panel facade.",
        },
        "services": ["construction", "facade", "engineering-networks", "earthworks-roads"],
        "photos": [
            ("finished", [("f", f"Парковка/IMG_{n}.jpg") for n in
                          (2391, 2383, 2385, 2386, 2389, 2390, 2353, 2355, 2359, 2364, 2369, 2374, 2378, 2379)]),
        ],
    },
    {
        "slug": "childrens-rehabilitation-center",
        "title": {"ru": "Республиканский детский реабилитационный центр",
                  "uz": "Respublika bolalar reabilitatsiya markazi",
                  "en": "National Children's Rehabilitation Center"},
        "kicker": {"ru": "Республиканский объект", "uz": "Respublika obyekti", "en": "National project"},
        "sector": "state", "type": "healthcare", "city": "tashkent-region", "role": "general",
        "status": "in_progress", "featured": True,
        "address": _addr("Ташкентская область, Кибрайский район", "Toshkent viloyati, Qibray tumani",
                         "Kibray district, Tashkent region"),
        "lat": 41.3660, "lng": 69.4060,
        "description": {
            "ru": "Центр реабилитации детей с заболеваниями опорно-двигательного аппарата на 200 коек: корпуса, "
                  "бассейн, палаты, благоустроенный внутренний двор.",
            "uz": "Tayanch-harakat a'zolari kasalliklari bo'lgan bolalar uchun 200 o'rinli reabilitatsiya markazi: "
                  "korpuslar, basseyn, palatalar, obod ichki hovli.",
            "en": "A 200-bed rehabilitation center for children with musculoskeletal conditions: wards, a pool and a "
                  "landscaped courtyard.",
        },
        "services": ["construction", "engineering-networks", "interior-finishing", "facade", "landscaping"],
        "photos": [
            ("render", [("f", f"{REHAB}/photo_2025-05-01_11-14-41 (3).jpg"), ("f", f"{REHAB}/photo_2025-05-01_11-14-41.jpg"),
                        ("f", f"{REHAB}/photo_2025-05-01_11-14-41 (2).jpg")]),
            ("construction", [("f", f"{REHAB}/IMG_{n}.jpg") for n in (1048, 1036, 1037, 1038, 1031, 1032, 1025, 1027)]),
        ],
    },
    {
        "slug": "kichkirik-canal",
        "title": {"ru": "Реконструкция канала «Кичкирик»", "uz": "«Kichkiriq» kanalini rekonstruksiya qilish",
                  "en": "Kichkirik canal reconstruction"},
        "kicker": {"ru": "Государственный объект", "uz": "Davlat obyekti", "en": "Public project"},
        "sector": "state", "type": "infrastructure", "city": "tashkent", "role": "general",
        "status": "completed", "featured": True,
        "address": _addr("г. Ташкент, Алмазарский район, канал Кичкирик", "Toshkent sh., Olmazor tumani, Kichkiriq kanali",
                         "Kichkirik canal, Almazar district, Tashkent"),
        "lat": 41.3360, "lng": 69.2210,
        "description": {
            "ru": "Набережная с прогулочными аллеями, фонтанами, павильонами, кафе и арт-объектами в национальном стиле "
                  "вдоль канала.",
            "uz": "Kanal bo'ylab sayr xiyobonlari, favvoralar, ayvonlar, kafelar va milliy uslubdagi san'at obyektlari "
                  "bilan sohil bo'yi.",
            "en": "A waterfront along the canal with promenades, fountains, pavilions, cafés and art objects in national style.",
        },
        "services": ["landscaping", "earthworks-roads", "construction", "engineering-networks"],
        "photos": [
            ("finished", [("f", "Кичкирик/photo_2026-09-11_18-19-22.jpg"),
                          ("glob", "Кичкирик/photo_*", ["photo_2026-09-11_13-25-30.jpg"])]),
        ],
    },
    {
        "slug": "matbuotchilar-uyi",
        "title": {"ru": "«Матбуотчилар уйи»", "uz": "«Matbuotchilar uyi»", "en": "Matbuotchilar Uyi (Press House)"},
        "kicker": {"ru": "Государственный объект", "uz": "Davlat obyekti", "en": "Public project"},
        "sector": "state", "type": "offices", "city": "tashkent", "role": "general",
        "status": "completed", "featured": True,
        "address": _addr("г. Ташкент, ул. Матбуотчилар, 32", "Toshkent sh., Matbuotchilar ko'chasi, 32",
                         "32 Matbuotchilar St, Tashkent"),
        "lat": 41.3135, "lng": 69.2720,
        "description": {
            "ru": "Административное здание с конференц-залами, open-space офисами и парадным входом. Фасад, интерьеры "
                  "и благоустройство площади.",
            "uz": "Konferens-zallar, ochiq ofislar va tantanali kirish qismi bo'lgan ma'muriy bino. Fasad, interyerlar va "
                  "maydonni obodonlashtirish.",
            "en": "An administrative building with conference halls, open-plan offices and a formal entrance plaza: facade, "
                  "interiors and landscaping.",
        },
        "services": ["construction", "facade", "interior-finishing", "engineering-networks", "landscaping"],
        "photo_opts": {"crop_bottom": 0.12},
        "photos": [
            ("finished", [("f", f"{MATBU}/IMG_20261028_{n}.jpg") for n in ("170544", "170600", "170639", "165349", "165426", "165447")]
             + [("f", f"{MATBU}/photo_2026-10-28_16-55-51.jpg")]
             + [("f", f"{MATBU}/IMG_20261028_{n}.jpg") for n in ("163727", "163809", "163845", "164936", "164954", "165008")]
             + [("f", f"{MATBU}/photo_2026-10-28_16-57-{n}.jpg") for n in ("36", "37", "43")]),
        ],
    },
    {
        "slug": "kokand-new-district",
        "title": {"ru": "Новый массив «Коканд»", "uz": "«Qo'qon» yangi massivi", "en": "New Kokand residential district"},
        "kicker": {"ru": "Жилой массив", "uz": "Turar-joy massivi", "en": "Residential district"},
        "sector": "commercial", "type": "residential", "city": "kokand", "role": "general",
        "status": "completed", "featured": True,
        "address": _addr("г. Коканд, ул. Мовароуннахр, дома 12, 13, 14", "Qo'qon sh., Movarounnahr ko'chasi, 12-13-14-uylar",
                         "12–14 Movarounnahr St, Kokand"),
        "lat": 40.5290, "lng": 70.9420,
        "description": {
            "ru": "Жилые дома с отделкой «под ключ»: подъезды, лифты, сантехника, кухни. На кровлях — солнечные "
                  "водонагреватели и панели.",
            "uz": "«Kalit topshirish» sharti bilan pardozlangan turar-joy binolari: kirish yo'laklari, liftlar, santexnika, "
                  "oshxonalar. Tomlarda quyosh suv isitgichlari va panellari.",
            "en": "Turnkey apartment buildings — entrances, lifts, plumbing and kitchens — with solar water heaters and "
                  "panels on the roofs.",
        },
        "services": ["construction", "interior-finishing", "engineering-networks", "facade"],
        "photos": [
            ("finished", [("f", "Массив Кокон/AIMG_1186.JPG")] + [("f", f"Массив Кокон/IMG_{n}.JPG") for n in (1182, 1183, 1184, 1185)]
             + [("glob", "Массив Кокон/IMG_*")]),
        ],
    },
    {
        "slug": "brb-bank-head-office",
        "title": {"ru": "Головной офис BRB Bank", "uz": "BRB Bank bosh ofisi", "en": "BRB Bank head office"},
        "kicker": {"ru": "Головной офис", "uz": "Bosh ofis", "en": "Head office"},
        "sector": "commercial", "type": "offices", "city": "tashkent", "role": "general", "status": "completed",
        "client": {"ru": "Biznesni Rivojlantirish Banki", "uz": "Biznesni Rivojlantirish Banki", "en": "Biznesni Rivojlantirish Banki"},
        "address": _addr("г. Ташкент, Шайхантахурский район, Чорсу", "Toshkent sh., Shayxontohur tumani, Chorsu",
                         "Chorsu, Shaykhantakhur district, Tashkent"),
        "lat": 41.3265, "lng": 69.2365,
        "description": {
            "ru": "Офисное здание банка со светопрозрачным фасадом на площади Чорсу.",
            "uz": "Chorsu maydonidagi shaffof fasadli bank ofis binosi.",
            "en": "A bank office building with a glazed facade on Chorsu square.",
        },
        "services": ["construction", "facade", "interior-finishing"],
        "photos": [("finished", [("d", "image61.jpg")]), ("construction", [("d", "image62.jpg"), ("d", "image63.jpg"), ("d", "image64.jpg")])],
    },
    {
        "slug": "tashkent-city-lot-6",
        "title": {"ru": "Tashkent City / Lot 6", "uz": "Tashkent City / Lot 6", "en": "Tashkent City / Lot 6"},
        "kicker": {"ru": "Деловой комплекс", "uz": "Biznes majmuasi", "en": "Business complex"},
        "sector": "commercial", "type": "offices", "city": "tashkent", "role": "contractor",
        "role_text": {"ru": "Подрядчик по бетонным и стальным работам", "uz": "Beton va po'lat ishlari bo'yicha pudratchi",
                      "en": "Concrete and steel works contractor"},
        "status": "in_progress", "featured": True,
        "address": _addr("г. Ташкент, ул. Ислама Каримова, 55", "Toshkent sh., Islom Karimov ko'chasi, 55",
                         "55 Islam Karimov St, Tashkent"),
        "lat": 41.3150, "lng": 69.2480,
        "description": {
            "ru": "Многофункциональный деловой комплекс в Tashkent City. Бетонные и стальные конструкции высотной части.",
            "uz": "Tashkent City'dagi ko'p funksiyali biznes majmuasi. Baland qismning beton va po'lat konstruksiyalari.",
            "en": "A mixed-use business complex in Tashkent City: concrete and steel structures of the high-rise.",
        },
        "services": ["construction"],
        "photos": [("render", [("d", "image65.jpg")]), ("construction", [("d", "image68.jpg"), ("d", "image66.jpg"), ("d", "image67.jpg")])],
    },
    {
        "slug": "assalom-boglar",
        "title": {"ru": "ЖК «Ассалом Боглар»", "uz": "«Assalom Bog'lar» turar-joy majmuasi", "en": "Assalom Boglar residential complex"},
        "kicker": {"ru": "Жилой комплекс", "uz": "Turar-joy majmuasi", "en": "Residential complex"},
        "sector": "commercial", "type": "residential", "city": "tashkent", "role": "general", "status": "in_progress",
        "address": _addr("г. Ташкент, Мирабадский район, ул. Шахриобод", "Toshkent sh., Mirobod tumani, Shahriobod ko'chasi",
                         "Shakhriobod St, Mirabad district, Tashkent"),
        "lat": 41.2930, "lng": 69.2665,
        "description": {
            "ru": "Высотный жилой комплекс с благоустроенным двором и детскими площадками.",
            "uz": "Obod hovli va bolalar maydonchalari bo'lgan ko'p qavatli turar-joy majmuasi.",
            "en": "A high-rise residential complex with a landscaped courtyard and playgrounds.",
        },
        "services": ["construction", "facade", "engineering-networks", "landscaping"],
        "photos": [
            ("render", [("glob", "Ассалом Боглар/*")]),
            ("construction", [("d", "image71.jpg"), ("d", "image72.jpg")]),
        ],
    },
    {
        "slug": "manhattan",
        "title": {"ru": "ЖК «Manhattan»", "uz": "«Manhattan» turar-joy majmuasi", "en": "Manhattan residential complex"},
        "kicker": {"ru": "Жилой комплекс", "uz": "Turar-joy majmuasi", "en": "Residential complex"},
        "sector": "commercial", "type": "residential", "city": "tashkent", "role": "general", "status": "in_progress",
        "address": _addr("г. Ташкент, пересечение улиц Махатмы Ганди и Асака",
                         "Toshkent sh., Mahatma Gandi va Asaka ko'chalari kesishmasi",
                         "Corner of Mahatma Gandhi and Asaka streets, Tashkent"),
        "lat": 41.3290, "lng": 69.3260,
        "description": {
            "ru": "Жилой комплекс из нескольких высотных секций с озеленёнными террасами.",
            "uz": "Ko'kalamzor terrasali bir nechta baland seksiyadan iborat turar-joy majmuasi.",
            "en": "A residential complex of several high-rise sections with planted terraces.",
        },
        "services": ["construction", "facade", "engineering-networks"],
        "photos": [("render", [("d", "image73.jpg"), ("d", "image75.jpg"), ("d", "image76.jpg")]), ("construction", [("d", "image74.jpg")])],
    },
    {
        "slug": "business-city",
        "title": {"ru": "ЖК «Бизнес Сити»", "uz": "«Biznes Siti» turar-joy majmuasi", "en": "Business City residential complex"},
        "kicker": {"ru": "Жилой комплекс", "uz": "Turar-joy majmuasi", "en": "Residential complex"},
        "sector": "commercial", "type": "residential", "city": "tashkent", "role": "general", "status": "in_progress",
        "address": _addr("г. Ташкент, Юнусабадский район, ул. Янги Шахар, 9", "Toshkent sh., Yunusobod tumani, Yangi Shahar ko'chasi, 9",
                         "9 Yangi Shakhar St, Yunusabad district, Tashkent"),
        "lat": 41.3700, "lng": 69.2850,
        "description": {
            "ru": "Жилой квартал в Юнусабаде с парковой зоной и коммерческими помещениями.",
            "uz": "Yunusobodda bog' hududi va tijorat xonalari bo'lgan turar-joy mavzesi.",
            "en": "A residential quarter in Yunusabad with a park and commercial units.",
        },
        "services": ["construction", "engineering-networks", "landscaping"],
        "photos": [("render", [("d", f"image{n}.jpg") for n in (77, 78, 79, 80)])],
    },
    {
        "slug": "school-358",
        "title": {"ru": "Школа № 358", "uz": "358-maktab", "en": "School No. 358"},
        "kicker": {"ru": "Школьное здание", "uz": "Maktab binosi", "en": "School building"},
        "sector": "state", "type": "education", "city": "tashkent", "role": "general", "status": "completed",
        "featured": True,
        "address": _addr("г. Ташкент, Бектемирский район, ул. Ширин, 20", "Toshkent sh., Bektemir tumani, Shirin ko'chasi, 20",
                         "20 Shirin St, Bektemir district, Tashkent"),
        "lat": 41.2100, "lng": 69.3340,
        "description": {
            "ru": "Новое здание школы с IT- и робототехническими лабораториями, современными классами и библиотекой.",
            "uz": "IT va robototexnika laboratoriyalari, zamonaviy sinflar va kutubxonaga ega yangi maktab binosi.",
            "en": "A new school building with IT and robotics labs, modern classrooms and a library.",
        },
        "services": ["construction", "interior-finishing", "engineering-networks", "facade"],
        "photos": [
            ("finished", [("d", "image81.jpg"), ("f", f"{SCHOOL}/photo_2025-03-20_15-47-59 (2).jpg"),
                          ("f", f"{SCHOOL}/photo_2025-03-20_15-47-59 (3).jpg"),
                          ("glob", f"{SCHOOL}/photo_2025-03-20_22-*")]),
        ],
    },
    {
        "slug": "tashkent-porcelain-factory",
        "title": {"ru": "Ташкентский фарфоровый завод", "uz": "Toshkent chinni zavodi", "en": "Tashkent Porcelain Factory"},
        "kicker": {"ru": "Промышленный объект", "uz": "Sanoat obyekti", "en": "Industrial project"},
        "sector": "state", "type": "industrial", "city": "tashkent", "role": "general", "status": "completed",
        "address": _addr("г. Ташкент, Алмазарский район, ул. Уста Ширин, 20", "Toshkent sh., Olmazor tumani, Usta Shirin ko'chasi, 20",
                         "20 Usta Shirin St, Almazar district, Tashkent"),
        "lat": 41.3420, "lng": 69.2150,
        "description": {
            "ru": "Производственные цеха, входная группа и благоустройство территории завода.",
            "uz": "Ishlab chiqarish sexlari, kirish guruhi va zavod hududini obodonlashtirish.",
            "en": "Production halls, the entrance group and landscaping of the factory grounds.",
        },
        "services": ["construction", "engineering-networks", "landscaping"],
        "photos": [("finished", [("d", f"image{n}.jpg") for n in (85, 86, 87, 88)])],
    },
    {
        "slug": "aloqabank-yunusabad",
        "title": {"ru": "Юнусабадский филиал ALOQABANK", "uz": "ALOQABANK Yunusobod filiali", "en": "ALOQABANK Yunusabad branch"},
        "kicker": {"ru": "Филиал банка", "uz": "Bank filiali", "en": "Bank branch"},
        "sector": "commercial", "type": "offices", "city": "tashkent", "role": "general", "status": "completed",
        "client": {"ru": "Aloqabank", "uz": "Aloqabank", "en": "Aloqabank"},
        "address": _addr("г. Ташкент, Юнусабадский район, ул. Олой, 1", "Toshkent sh., Yunusobod tumani, Oloy ko'chasi, 1",
                         "1 Oloy St, Yunusabad district, Tashkent"),
        "lat": 41.3560, "lng": 69.2860,
        "description": {
            "ru": "Отделение банка «под ключ»: остеклённый фасад, операционный зал и офисные помещения.",
            "uz": "«Kalit topshirish» sharti bilan bank bo'limi: shishali fasad, operatsion zal va ofis xonalari.",
            "en": "A turnkey bank branch: glazed facade, banking hall and offices.",
        },
        "services": ["construction", "facade", "interior-finishing"],
        "photos": [("render", [("d", "image89.jpg")]), ("finished", [("d", "image90.jpg"), ("d", "image91.jpg")]), ("render", [("d", "image92.jpg")])],
    },
    {
        "slug": "kindergarten-168",
        "title": {"ru": "Детский сад № 168", "uz": "168-son bolalar bog'chasi", "en": "Kindergarten No. 168"},
        "kicker": {"ru": "Дошкольное учреждение", "uz": "Maktabgacha ta'lim muassasasi", "en": "Preschool"},
        "sector": "state", "type": "education", "city": "tashkent", "role": "general", "status": "in_progress",
        "address": _addr("г. Ташкент, Алмазарский район, махалля «Чустий»", "Toshkent sh., Olmazor tumani, «Chustiy» mahallasi",
                         "Chustiy mahalla, Almazar district, Tashkent"),
        "lat": 41.3480, "lng": 69.2240,
        "description": {
            "ru": "Двухэтажный детский сад с бассейном и прогулочными площадками.",
            "uz": "Basseyn va sayr maydonchalari bo'lgan ikki qavatli bolalar bog'chasi.",
            "en": "A two-storey kindergarten with a pool and play areas.",
        },
        "services": ["construction", "engineering-networks", "landscaping"],
        "photos": [("render", [("f", "Детский сад № 168/photo_2024-03-30_14-13-17.jpg"), ("glob", "Детский сад № 168/*")])],
    },
    {
        "slug": "aloqabank-yashnabad",
        "title": {"ru": "Яшнабадский филиал ALOQABANK", "uz": "ALOQABANK Yashnobod filiali", "en": "ALOQABANK Yashnabad branch"},
        "kicker": {"ru": "Филиал банка", "uz": "Bank filiali", "en": "Bank branch"},
        "sector": "commercial", "type": "offices", "city": "tashkent", "role": "general", "status": "completed",
        "client": {"ru": "Aloqabank Uzbekistan", "uz": "Aloqabank Uzbekistan", "en": "Aloqabank Uzbekistan"},
        "address": _addr("г. Ташкент, Яшнабадский район, ул. С. Азимова, 63А", "Toshkent sh., Yashnobod tumani, S. Azimov ko'chasi, 63A",
                         "63A S. Azimov St, Yashnabad district, Tashkent"),
        "lat": 41.2990, "lng": 69.3310,
        "description": {
            "ru": "Здание филиала «под ключ» с фасадом и интерьерами в фирменном стиле банка.",
            "uz": "Bankning korporativ uslubidagi fasad va interyerlarga ega «kalit topshirish» filial binosi.",
            "en": "A turnkey branch building with facade and interiors in the bank's corporate style.",
        },
        "services": ["construction", "facade", "interior-finishing"],
        "photos": [("render", [("d", "image96.jpg")]), ("", [("d", "image97.jpg"), ("d", "image98.jpg"), ("d", "image99.jpg")])],
    },
    {
        "slug": "bostanlyk-residential",
        "title": {"ru": "ЖК в Бостанлыкском районе", "uz": "Bo'stonliq tumanidagi turar-joy majmuasi",
                  "en": "Residential complex in Bostanlyk district"},
        "kicker": {"ru": "Жилой комплекс", "uz": "Turar-joy majmuasi", "en": "Residential complex"},
        "sector": "commercial", "type": "residential", "city": "tashkent-region", "role": "general", "status": "completed",
        "address": _addr("Ташкентская область, Бостанлыкский район, ул. Амира Темура, 102",
                         "Toshkent viloyati, Bo'stonliq tumani, Amir Temur ko'chasi, 102",
                         "102 Amir Temur St, Bostanlyk district, Tashkent region"),
        "lat": 41.5640, "lng": 69.7690,
        "description": {
            "ru": "Жилой дом с отделкой мест общего пользования и благоустроенным двором.",
            "uz": "Umumiy foydalanish joylari pardozlangan va hovlisi obodonlashtirilgan turar-joy binosi.",
            "en": "An apartment building with finished common areas and a landscaped yard.",
        },
        "services": ["construction", "interior-finishing", "facade", "landscaping"],
        "photos": [("finished", [("d", "image100.jpg")]), ("", [("d", "image101.jpg"), ("d", "image102.jpg"), ("d", "image103.jpg")])],
    },
    {
        "slug": "nizami-university",
        "title": {"ru": "Педагогический университет им. Низами", "uz": "Nizomiy nomidagi pedagogika universiteti",
                  "en": "Nizami Pedagogical University"},
        "kicker": {"ru": "Ташкентский государственный педагогический университет",
                   "uz": "Toshkent davlat pedagogika universiteti", "en": "Tashkent State Pedagogical University"},
        "sector": "state", "type": "education", "city": "tashkent", "role": "contractor",
        "role_text": {"ru": "Строительство кухни и столовой", "uz": "Oshxona va ovqatlanish zalini qurish",
                      "en": "Kitchen and canteen construction"},
        "status": "completed",
        "address": _addr("г. Ташкент, ул. Бунёдкор", "Toshkent sh., Bunyodkor ko'chasi", "Bunyodkor St, Tashkent"),
        "lat": 41.2930, "lng": 69.2130,
        "description": {
            "ru": "Пристройка с профессиональной кухней и столовой для студентов.",
            "uz": "Talabalar uchun professional oshxona va ovqatlanish zali bo'lgan qo'shimcha bino.",
            "en": "An extension with a professional kitchen and a student canteen.",
        },
        "services": ["construction", "interior-finishing", "engineering-networks"],
        "photos": [("finished", [("d", "image104.jpg")]), ("", [("d", "image105.jpg"), ("d", "image106.jpg"), ("d", "image107.jpg")])],
    },
    {
        "slug": "hosilot-hotel",
        "title": {"ru": "Гостиница «Hosilot»", "uz": "«Hosilot» mehmonxonasi", "en": "Hosilot Hotel"},
        "kicker": {"ru": "Гостиница", "uz": "Mehmonxona", "en": "Hotel"},
        "sector": "commercial", "type": "hospitality", "city": "tashkent", "role": "reconstruction", "status": "completed",
        "address": _addr("г. Ташкент, ул. Шота Руставели, 95", "Toshkent sh., Shota Rustaveli ko'chasi, 95",
                         "95 Shota Rustaveli St, Tashkent"),
        "lat": 41.2860, "lng": 69.2620,
        "description": {
            "ru": "Реконструкция гостиницы: фасад, номерной фонд, лобби и летняя терраса.",
            "uz": "Mehmonxonani rekonstruksiya qilish: fasad, xonalar, lobbi va yozgi ayvon.",
            "en": "Hotel reconstruction: facade, guest rooms, lobby and summer terrace.",
        },
        "services": ["facade", "interior-finishing", "engineering-networks"],
        "photos": [("finished", [("d", "image108.jpg")]), ("", [("d", "image109.jpg"), ("d", "image110.jpg"), ("d", "image111.jpg")])],
    },
    {
        "slug": "bukhara-culture-house",
        "title": {"ru": "Дом культуры в Бухаре", "uz": "Buxorodagi madaniyat uyi", "en": "House of Culture in Bukhara"},
        "kicker": {"ru": "Культурный объект", "uz": "Madaniyat obyekti", "en": "Cultural project"},
        "sector": "state", "type": "public", "city": "bukhara", "role": "general", "status": "completed",
        "address": _addr("г. Бухара", "Buxoro sh.", "Bukhara"),
        "lat": 39.7740, "lng": 64.4210,
        "description": {
            "ru": "Реконструкция здания дома культуры: фасад, атриум, залы и входная группа.",
            "uz": "Madaniyat uyi binosini rekonstruksiya qilish: fasad, atrium, zallar va kirish guruhi.",
            "en": "Reconstruction of a house of culture: facade, atrium, halls and entrance.",
        },
        "services": ["construction", "facade", "interior-finishing"],
        "photos": [("construction", [("d", "image112.jpg")]), ("", [("d", "image113.jpg"), ("d", "image114.jpg"), ("d", "image115.jpg")])],
    },
]

HERO = [
    ("matbuotchilar-uyi", ("f", f"{MATBU}/IMG_20261028_170544.jpg"), {"crop_bottom": 0.12}),
    ("parking-complex-fargona-yuli", ("f", "Парковка/IMG_2391.jpg"), {}),
    ("kichkirik-canal", ("f", "Кичкирик/photo_2026-09-11_18-19-22.jpg"), {}),
    ("bukhara-hotel-islamic-civilization-center", ("f", f"{ISLAMIC}/photo_2025-05-01_11-34-40 (3).jpg"), {}),
    ("tashkent-city-lot-6", ("d", "image65.jpg"), {"trim": True}),
]
