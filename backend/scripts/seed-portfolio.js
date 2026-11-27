import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const email = "nara.wibowo@financetrack.test";
const timezone = "Asia/Jakarta";
const currency = "IDR";

const accounts = {
  main: [
    "BCA Tahapan · Rekening utama",
    "bank",
    12340000,
    "Gaji, sewa, tagihan, dan kebutuhan harian",
  ],
  studio: [
    "Jenius · Proyek desain",
    "bank",
    4980000,
    "Penerimaan klien dan pengeluaran proyek",
  ],
  savings: [
    "Bank Jago · Kantong tabungan",
    "bank",
    18450000,
    "Dana darurat dan rencana jangka menengah",
  ],
  transport: [
    "GoPay · Mobilitas",
    "ewallet",
    295000,
    "Perjalanan dan pesan antar",
  ],
  wallet: [
    "ShopeePay · Belanja daring",
    "ewallet",
    216500,
    "Pesanan marketplace dan promosi ongkos kirim",
  ],
  cash: [
    "Tunai · Dompet harian",
    "cash",
    380000,
    "Pasar, parkir, dan warung sekitar rumah",
  ],
  travel: [
    "Flazz · Tol dan transit",
    "other",
    172000,
    "Saldo kartu tol, MRT, dan parkir",
  ],
  old: [
    "OVO · Dompet lama",
    "ewallet",
    185000,
    "Riwayat pembayaran sebelum beralih ke GoPay",
  ],
};

const customCategories = [
  ["Honor desain", "income", "#426B84"],
  ["Penggantian biaya", "income", "#678D58"],
  ["Sewa dan utilitas", "expense", "#6E6499"],
  ["Kebutuhan kantor", "expense", "#498C91"],
  ["Langganan digital", "expense", "#8A6CA9"],
  ["Perawatan diri", "expense", "#B86B82"],
  ["Keluarga dan hadiah", "expense", "#AC7654"],
  ["Perjalanan", "expense", "#4B779C"],
  ["Pajak dan administrasi", "expense", "#807056"],
  ["Hewan peliharaan", "expense", "#65855F"],
  ["Komuter lama", "expense", "#737877"],
];

// Each group contains prices for specific purchases, with a small range for
// add-ons, fare changes, discounts, or order size.
const purchases = {
  breakfast: [
    ["Makanan", "cash", 16000, 9000, "Bubur ayam depan stasiun"],
    ["Makanan", "cash", 14000, 7000, "Nasi uduk Bu Sari dan teh tawar"],
    ["Makanan", "main", 29000, 16000, "Kopi Tuku Cipete sebelum berangkat"],
    ["Makanan", "transport", 23000, 17000, "Roti dan es americano di kios MRT"],
    ["Makanan", "cash", 17000, 5000, "Lontong sayur dekat rumah"],
  ],
  lunch: [
    ["Makanan", "cash", 25000, 10000, "Nasi rames di kantin Menara Satrio"],
    ["Makanan", "main", 44000, 25000, "Makan siang di Gado-Gado Kartika"],
    [
      "Makanan",
      "transport",
      39000,
      26000,
      "GoFood · ayam sambal matah dan ongkir",
    ],
    ["Makanan", "main", 47000, 18000, "Bakmi dan pangsit bersama tim desain"],
    ["Makanan", "cash", 26000, 8000, "Soto Betawi dekat kantor"],
    ["Makanan", "main", 57000, 20000, "Salad dan roti di kantin kantor"],
    [
      "Makanan",
      "transport",
      31000,
      17000,
      "Pesan nasi padang untuk makan siang di rumah",
    ],
  ],
  commute: [
    [
      "Transportasi",
      "travel",
      14000,
      14000,
      "MRT Cipete Raya–Setiabudi pulang pergi",
    ],
    ["Transportasi", "transport", 14000, 11000, "Gojek dari stasiun ke rumah"],
    ["Transportasi", "cash", 5000, 7000, "Parkir motor di stasiun"],
    [
      "Transportasi",
      "travel",
      10000,
      15000,
      "Tap masuk MRT dan sambungan TransJakarta",
    ],
    ["Transportasi", "transport", 23000, 18000, "Gojek pulang setelah hujan"],
    [
      "Transportasi",
      "main",
      43000,
      49000,
      "GrabCar untuk bawa perangkat kerja",
    ],
  ],
  groceries: [
    [
      "Makanan",
      "main",
      175000,
      155000,
      "Sayur, telur, dan lauk mingguan di Super Indo",
    ],
    [
      "Makanan",
      "cash",
      72000,
      58000,
      "Cabai, ayam, tempe, dan buah di Pasar Cipete",
    ],
    [
      "Makanan",
      "main",
      115000,
      115000,
      "Susu, yoghurt, dan buah di Farmers Market",
    ],
    [
      "Rumah tangga",
      "main",
      110000,
      119000,
      "Sabun cuci, pembersih dapur, dan tisu",
    ],
    [
      "Makanan",
      "wallet",
      92000,
      102000,
      "Beras dan bumbu dapur dari toko resmi",
    ],
    ["Makanan", "cash", 59000, 68000, "Ikan dan sayuran di pasar pagi"],
    [
      "Rumah tangga",
      "main",
      42000,
      42000,
      "Galon isi ulang dan tabung gas cadangan",
    ],
  ],
  weekend: [
    ["Makanan", "main", 105000, 107000, "Makan malam berdua di Blok M"],
    ["Hiburan", "main", 95000, 75000, "Dua tiket film di Plaza Senayan"],
    [
      "Makanan",
      "transport",
      46000,
      37000,
      "Martabak manis untuk dibawa pulang",
    ],
    ["Hiburan", "main", 55000, 65000, "Tiket pameran ilustrasi di TIM"],
    ["Makanan", "main", 71000, 89000, "Brunch setelah lari pagi di GBK"],
    [
      "Keluarga dan hadiah",
      "main",
      97000,
      141000,
      "Bawa kue dan buah saat mampir ke rumah orang tua",
    ],
    ["Hiburan", "cash", 30000, 39000, "Sewa lapangan bulu tangkis patungan"],
    [
      "Makanan",
      "main",
      64000,
      78000,
      "Dua kopi susu dan roti panggang di Tebet",
    ],
  ],
  errands: [
    [
      "Belanja",
      "wallet",
      35000,
      139000,
      "Kabel USB-C dan pelindung kabel di marketplace",
    ],
    [
      "Kebutuhan kantor",
      "studio",
      26500,
      83000,
      "Cetak proof warna dan kertas presentasi",
    ],
    [
      "Kesehatan",
      "main",
      43000,
      92000,
      "Vitamin dan obat rutin di Kimia Farma",
    ],
    [
      "Perawatan diri",
      "cash",
      50000,
      40000,
      "Pangkas rambut di barbershop dekat rumah",
    ],
    ["Rumah tangga", "cash", 25000, 51000, "Laundry kiloan dan cuci selimut"],
    [
      "Perawatan diri",
      "wallet",
      67000,
      144000,
      "Tabir surya, sampo, dan isi ulang sabun",
    ],
    [
      "Hewan peliharaan",
      "wallet",
      76000,
      157000,
      "Pakan kucing dan pasir dari toko langganan",
    ],
    [
      "Belanja",
      "main",
      79000,
      193000,
      "Kaos kerja dan kaus kaki di pusat belanja",
    ],
    [
      "Keluarga dan hadiah",
      "main",
      85000,
      172000,
      "Hadiah ulang tahun dan kartu ucapan",
    ],
    [
      "Kebutuhan kantor",
      "studio",
      50000,
      55000,
      "Kurir dokumen dan paket contoh untuk klien",
    ],
    ["Pendidikan", "main", 68000, 169000, "Buku desain dan riset pengguna"],
    [
      "Rumah tangga",
      "main",
      65000,
      170000,
      "Perlengkapan kebersihan dan filter air",
    ],
  ],
};

function dateShift(day, days) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthShift(day, months, date = 1) {
  const [year, month] = day.split("-").map(Number);
  const last = new Date(Date.UTC(year, month + months, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + months, Math.min(date, last)))
    .toISOString()
    .slice(0, 10);
}

function fingerprint(db, excludedId) {
  const hash = createHash("sha256");
  for (const [table, owner] of [
    ["users", "id"],
    ["records", "user_id"],
    ["sessions", "user_id"],
    ["password_resets", "user_id"],
    ["idempotency", "user_id"],
  ]) {
    const rows = db
      .prepare(`SELECT * FROM ${table} WHERE ${owner}<>? ORDER BY rowid`)
      .all(excludedId);
    hash.update(JSON.stringify(rows));
  }
  return hash.digest("hex");
}

function verifyDatabase(db) {
  assert.deepEqual(db.prepare("PRAGMA quick_check").all().map(Object.values), [
    ["ok"],
  ]);
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
}

function installPortfolio(source, target) {
  assert(
    existsSync(source) && existsSync(target),
    "Database sumber dan tujuan harus sudah ada.",
  );
  assert.notEqual(resolve(source), resolve(target));
  const db = new DatabaseSync(target, { enableForeignKeyConstraints: true });
  try {
    db.exec("PRAGMA busy_timeout=5000");
    db.prepare("ATTACH DATABASE ? AS portfolio").run(resolve(source));
    const user = db
      .prepare("SELECT id FROM portfolio.users WHERE email=?")
      .get(email);
    assert(user, "Akun sintetis tidak ada di database sumber.");
    db.exec("BEGIN IMMEDIATE");
    try {
      assert(
        !db
          .prepare("SELECT 1 FROM main.users WHERE email=? OR id=?")
          .get(email, user.id),
        "Akun sintetis sudah ada; pemasangan dibatalkan tanpa menimpa data.",
      );
      const oldData = fingerprint(db, user.id);
      db.prepare(
        `INSERT INTO main.users
        (id,email,password_hash,name,currency,timezone,theme,preferences,created_at,updated_at)
        SELECT id,email,password_hash,name,currency,timezone,theme,preferences,created_at,updated_at
        FROM portfolio.users WHERE id=?`,
      ).run(user.id);
      const result = db
        .prepare(
          `INSERT INTO main.records
        (id,user_id,kind,data,created_at,updated_at)
        SELECT id,user_id,kind,data,created_at,updated_at FROM portfolio.records WHERE user_id=?`,
        )
        .run(user.id);
      assert(result.changes > 2000);
      assert.equal(
        fingerprint(db, user.id),
        oldData,
        "Data yang sudah ada berubah.",
      );
      verifyDatabase(db);
      db.exec("COMMIT");
      console.log(
        `${email}: ${result.changes} record dipasang; data sebelumnya identik.`,
      );
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.close();
  }
}

async function stagePortfolio(filename, password) {
  assert(
    process.env.NODE_ENV !== "production" && !existsSync(filename),
    "Gunakan file staging baru di lingkungan pengembangan.",
  );
  const { default: request } = await import("supertest");
  const { createApp } = await import("../src/app.js");
  const { today, nextDate } = await import("../src/services/validation.js");
  const { app, db, repo, scheduled } = createApp({
    databasePath: filename,
    rateLimitEnabled: false,
  });
  const agent = request.agent(app);
  const now = today(timezone);
  const opening = monthShift(now, -19);
  const dates = new Map();
  const account = {};
  const category = {};
  let csrf;
  let randomState = 22684917;
  const random = () => {
    randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
  const pick = (values) => values[integer(0, values.length - 1)];
  const chance = (probability) => random() < probability;
  const rounded = (amount, step = 500) => Math.round(amount / step) * step;
  const call = async (method, route, body) => {
    const req = agent[method](`/api${route}`);
    if (method !== "get") {
      req.set("Idempotency-Key", randomUUID()).send(body ?? {});
      if (csrf) req.set("X-CSRF-Token", csrf);
    }
    const response = await req;
    assert(
      response.ok,
      `${method.toUpperCase()} ${route}: ${response.status} ${JSON.stringify(response.body)}`,
    );
    return response.body;
  };
  const create = async (route, data, date) => {
    const result = await call("post", route, data);
    if (date) dates.set(result.id, date);
    return result;
  };
  const entry = (type, wallet, name, amount, date, description) => ({
    type,
    accountId: account[wallet].id,
    categoryId: category[name].id,
    amount,
    date,
    description,
  });
  const expense = (item, date) => {
    const [name, wallet, min, difference, description] = item;
    return entry(
      "expense",
      wallet,
      name,
      rounded(min + integer(0, difference)),
      date,
      description,
    );
  };
  const transfer = (from, to, amount, date, description) => ({
    type: "transfer",
    fromAccountId: account[from].id,
    toAccountId: account[to].id,
    amount,
    date,
    description,
  });

  try {
    const registration = await create("/auth/register", {
      name: "Nara Wibowo",
      email,
      password,
      currency,
      timezone,
    });
    csrf = registration.csrfToken;
    const uid = registration.user.id;
    for (const [
      key,
      [name, type, openingBalance, description],
    ] of Object.entries(accounts)) {
      account[key] = await create(
        "/accounts",
        {
          name,
          type,
          openingBalance,
          openingBalanceDate: opening,
          description,
        },
        opening,
      );
    }
    for (const reference of await call("get", "/categories")) {
      category[reference.name] = reference;
      dates.set(reference.id, opening);
    }
    for (const [name, type, color] of customCategories) {
      category[name] = await create(
        "/categories",
        { name, type, color },
        opening,
      );
    }

    const schedules = [
      [
        "income",
        "main",
        "Gaji",
        14850000,
        "Gaji bulanan · Studio Arunika",
        "monthly",
        monthShift(opening, 0, 31),
      ],
      [
        "income",
        "studio",
        "Honor desain",
        2350000,
        "Retainer desain · Toko Kopi Lereng",
        "monthly",
        monthShift(opening, 4, 12),
      ],
      [
        "expense",
        "studio",
        "Langganan digital",
        248000,
        "Figma Professional · lisensi studio",
        "monthly",
        monthShift(opening, 0, 8),
      ],
      [
        "expense",
        "main",
        "Langganan digital",
        59000,
        "Spotify Premium Duo",
        "monthly",
        monthShift(opening, 0, 16),
      ],
      [
        "expense",
        "main",
        "Keluarga dan hadiah",
        125000,
        "Iuran belanja keluarga setiap Jumat",
        "weekly",
        dateShift(opening, 3),
      ],
      [
        "expense",
        "studio",
        "Langganan digital",
        279000,
        "Perpanjangan domain narawibowo.design",
        "yearly",
        monthShift(opening, 1, 19),
      ],
      [
        "expense",
        "cash",
        "Transportasi",
        18000,
        "Parkir harian selama proyek di Kemang",
        "daily",
        monthShift(opening, 6, 3),
        monthShift(opening, 6, 14),
      ],
      [
        "expense",
        "main",
        "Kesehatan",
        320000,
        "Sesi fisioterapi pascacedera",
        "weekly",
        monthShift(opening, 8, 2),
        monthShift(opening, 9, 9),
      ],
      [
        "expense",
        "main",
        "Pendidikan",
        570000,
        "Kelas bahasa Jepang di Cikini",
        "monthly",
        monthShift(opening, 11, 6),
        null,
        "paused",
      ],
      [
        "expense",
        "old",
        "Langganan digital",
        35000,
        "Paket arsip foto pada dompet lama",
        "monthly",
        monthShift(opening, 0, 23),
        null,
        "retired",
      ],
      [
        "expense",
        "main",
        "Kesehatan",
        340000,
        "Iuran asuransi kesehatan pribadi",
        "monthly",
        monthShift(opening, 2, 5),
      ],
      [
        "expense",
        "studio",
        "Langganan digital",
        49000,
        "Cadangan berkas iCloud+",
        "monthly",
        monthShift(opening, 3, 26),
      ],
    ];
    const jobs = [];
    for (const [
      type,
      wallet,
      name,
      amount,
      description,
      frequency,
      startDate,
      endDate,
      state,
    ] of schedules) {
      const job = await create(
        "/recurring",
        {
          type,
          amount,
          description,
          frequency,
          startDate,
          endDate,
          accountId: account[wallet].id,
          categoryId: category[name].id,
        },
        startDate,
      );
      jobs.push({ ...job, state });
    }
    const processDate = (date) =>
      scheduled.run(new Date(date + "T12:00:00Z"), uid);
    for (const [month, day, amount, description] of [
      [0, 15, 16500, "Ojek dari MRT Cipete · pembayaran OVO"],
      [1, 9, 12500, "Parkir dan ojek dari Blok A"],
      [2, 17, 14000, "Ojek setelah hujan · pembayaran OVO"],
    ]) {
      const date = monthShift(opening, month, day);
      await create(
        "/transactions",
        entry("expense", "old", "Komuter lama", amount, date, description),
        date,
      );
    }
    processDate(monthShift(opening, 4, 22));
    await call("post", `/accounts/${account.old.id}/archive`);
    processDate(monthShift(opening, 4, 26));
    const retired = jobs.find((job) => job.state === "retired");
    await call("patch", `/recurring/${retired.id}`, { isEnded: true });
    processDate(monthShift(opening, 14, 8));
    const paused = jobs.find((job) => job.state === "paused");
    await call("patch", `/recurring/${paused.id}`, { isPaused: true });
    await create("/recurring/process", {});
    assert.equal((await create("/recurring/process", {})).processed, 0);

    const bills = [
      [
        "Sewa apartemen · unit C-12",
        "Tempat tinggal",
        "main",
        3450000,
        "monthly",
        monthShift(opening, 0, 2),
        5,
        "Transfer ke pengelola Apartemen Taman Cipete",
      ],
      [
        "Internet rumah · Biznet",
        "Sewa dan utilitas",
        "main",
        375000,
        "monthly",
        monthShift(opening, 0, 17),
        5,
        "Paket 100 Mbps; bukti bayar disimpan di email",
      ],
      [
        "IPL apartemen · Triwulan",
        "Tempat tinggal",
        "main",
        690000,
        "once",
        dateShift(now, -8),
        7,
        "Iuran pemeliharaan dan pengangkutan sampah",
      ],
      [
        "Perpanjangan SIM A",
        "Pajak dan administrasi",
        "main",
        140000,
        "once",
        dateShift(now, 9),
        14,
        "Termasuk biaya tes kesehatan",
      ],
      [
        "Servis AC kamar dan ruang tamu",
        "Rumah tangga",
        "main",
        285000,
        "once",
        now,
        3,
        "Dua unit, jadwal teknisi sore hari",
      ],
      [
        "Iuran komunitas desain",
        "Pendidikan",
        "studio",
        400000,
        "yearly",
        monthShift(opening, 6, 18),
        14,
        "Keanggotaan tahunan untuk kelas dan acara",
      ],
      [
        "Vaksin tahunan Miko",
        "Hewan peliharaan",
        "main",
        385000,
        "yearly",
        monthShift(opening, 3, 9),
        10,
        "Reservasi di klinik hewan dekat rumah",
      ],
      [
        "Deposit perawatan apartemen lama",
        "Tempat tinggal",
        "main",
        225000,
        "once",
        monthShift(opening, 0, 21),
        7,
        "Dibatalkan setelah serah terima unit",
      ],
      [
        "BPJS Kesehatan · Ibu",
        "Kesehatan",
        "main",
        150000,
        "monthly",
        monthShift(opening, 2, 10),
        4,
        "Dibayar melalui mobile banking",
      ],
      [
        "Servis berkala motor",
        "Transportasi",
        "main",
        328500,
        "once",
        monthShift(now, -2, 20),
        3,
        "Ganti oli, cek rem, dan pembersihan injektor",
      ],
    ];
    for (const [
      name,
      cat,
      wallet,
      amount,
      frequency,
      dueDate,
      reminderDays,
      note,
    ] of bills) {
      const initial = await create(
        "/bills",
        {
          name,
          categoryId: category[cat].id,
          amount,
          frequency,
          dueDate,
          reminderDays,
          note,
        },
        dueDate,
      );
      if (name.includes("apartemen lama")) {
        await call("patch", `/bills/${initial.id}`, { isArchived: true });
        continue;
      }
      if (name.startsWith("IPL") || name.startsWith("Servis AC")) continue;
      let bill = initial;
      while (bill.dueDate < dateShift(now, -2)) {
        const candidate = dateShift(
          bill.dueDate,
          chance(0.14) ? 1 : -integer(0, 2),
        );
        const paymentDate = candidate < opening ? opening : candidate;
        if (chance(0.28)) {
          const tx = await create(
            "/transactions",
            entry(
              "expense",
              wallet,
              cat,
              amount,
              paymentDate,
              `${name} · dibayar via ${wallet === "studio" ? "Jenius" : "BCA"}`,
            ),
          );
          await create(`/bills/${bill.id}/pay`, { transactionId: tx.id });
        } else {
          await create(`/bills/${bill.id}/pay`, {
            accountId: account[wallet].id,
            date: paymentDate,
          });
        }
        if (frequency === "once") break;
        const expected = nextDate(bill.dueDate, frequency, initial.dueDate);
        bill = (await call("get", "/bills")).find(
          (next) => next.parentBillId === bill.id,
        );
        assert.equal(bill.dueDate, expected);
      }
    }
    for (let month = 0; month < 20; month++) {
      for (const [name, min, max, day] of [
        ["PLN · Listrik apartemen", 235, 407, 20],
        ["PAM · Air apartemen", 53, 119, 14],
      ]) {
        const dueDate = monthShift(opening, month, day);
        if (dueDate > dateShift(now, 20)) continue;
        const bill = await create(
          "/bills",
          {
            name,
            amount: integer(min, max) * 1000 + pick([0, 500, 1200, 2700]),
            dueDate,
            frequency: "once",
            categoryId: category["Sewa dan utilitas"].id,
            reminderDays: 5,
            note: "Nominal mengikuti pemakaian pada periode tagihan.",
          },
          dueDate,
        );
        if (dueDate < dateShift(now, -4))
          await create(`/bills/${bill.id}/pay`, {
            accountId: account.main.id,
            date: dateShift(dueDate, -integer(0, 3)),
          });
      }
    }
    console.log("Rekening, kategori, jadwal, dan riwayat pembayaran siap.");

    const planned = new Map();
    const plan = (tx) => {
      if (tx.date > now) return;
      if (!planned.has(tx.date)) planned.set(tx.date, []);
      planned.get(tx.date).push(tx);
    };
    for (let date = opening; date <= now; date = dateShift(date, 1)) {
      const weekday = new Date(date + "T12:00:00Z").getUTCDay();
      const workday = weekday !== 0 && weekday !== 6;
      if (workday && chance(0.53))
        plan(expense(pick(purchases.breakfast), date));
      if (workday && chance(0.81)) plan(expense(pick(purchases.lunch), date));
      if (workday && weekday !== 3 && chance(0.87))
        plan(expense(pick(purchases.commute), date));
      if (!workday && chance(0.84))
        plan(expense(pick(purchases.weekend), date));
      if ((!workday && chance(0.63)) || (weekday === 2 && chance(0.43)))
        plan(expense(pick(purchases.groceries), date));
      if (chance(workday ? 0.38 : 0.55))
        plan(expense(pick(purchases.errands), date));
    }
    const projects = [
      [1, "Katalog menu Kopi Lereng", 4050000, 580000],
      [3, "Landing page Saji Sekitar", 7200000, 980000],
      [5, "Identitas visual Pasar Rindang", 8500000, 1720000],
      [8, "Audit UX BelajarBareng", 6400000, 450000],
      [10, "Riset onboarding Teman Tani", 9250000, 1530000],
      [12, "Prototipe reservasi Ruang Raya", 6900000, 820000],
      [15, "Penyegaran katalog Bumi Keramik", 5150000, 625000],
      [17, "Sistem desain Saji Sekitar", 10850000, 1240000],
      [19, "Foto dan katalog Pagi Pangan", 5700000, 890000],
    ];
    for (const [month, name, fee, costs] of projects) {
      const deposit = rounded(fee * 0.4, 1000);
      plan(
        entry(
          "income",
          "studio",
          "Honor desain",
          deposit,
          monthShift(opening, month, integer(3, 10)),
          `Uang muka · ${name}`,
        ),
      );
      plan(
        entry(
          "expense",
          "studio",
          "Kebutuhan kantor",
          costs,
          monthShift(opening, month, integer(11, 16)),
          `Produksi dan kebutuhan proyek · ${name}`,
        ),
      );
      plan(
        entry(
          "income",
          "studio",
          "Honor desain",
          fee - deposit,
          monthShift(opening, month + 1, integer(5, 17)),
          `Pelunasan proyek · ${name}`,
        ),
      );
    }
    for (let month = 0; month < 20; month++) {
      plan(
        entry(
          "income",
          "savings",
          "Investasi",
          integer(27400, 86500),
          monthShift(opening, month, 25),
          "Bunga kantong tabungan setelah pajak",
        ),
      );
      if (month % 3 === 1)
        plan(
          entry(
            "income",
            "main",
            "Penggantian biaya",
            integer(270, 755) * 1000,
            monthShift(opening, month, 17),
            "Penggantian transport dan konsumsi kunjungan kantor",
          ),
        );
      if (month % 4 === 2)
        plan(
          entry(
            "expense",
            "studio",
            "Pajak dan administrasi",
            integer(170, 380) * 1000,
            monthShift(opening, month, 24),
            "Setoran pajak penghasilan sampingan",
          ),
        );
      if (month > 0)
        plan(
          transfer(
            "main",
            "savings",
            integer(30, 46) * 100000,
            monthShift(opening, month, integer(3, 6)),
            pick([
              "Sisihkan gaji ke kantong tabungan",
              "Alokasi dana darurat dan rencana liburan",
              "Pindahkan bagian tabungan setelah gaji masuk",
            ]),
          ),
        );
    }
    for (const [month, day, type, wallet, name, amount, description] of [
      [
        2,
        14,
        "expense",
        "main",
        "Perjalanan",
        1694000,
        "KA Argo Parahyangan dan penginapan akhir pekan di Bandung",
      ],
      [
        4,
        6,
        "expense",
        "studio",
        "Kebutuhan kantor",
        2149000,
        "Monitor IPS untuk meja kerja di rumah",
      ],
      [
        7,
        19,
        "expense",
        "main",
        "Kesehatan",
        547500,
        "Pemeriksaan gigi dan scaling",
      ],
      [
        8,
        16,
        "income",
        "main",
        "Hadiah",
        450000,
        "Hadiah ulang tahun dari keluarga",
      ],
      [
        8,
        22,
        "expense",
        "main",
        "Perjalanan",
        2678000,
        "Tiket kereta dan hotel libur akhir tahun di Yogyakarta",
      ],
      [
        9,
        15,
        "income",
        "main",
        "Pemasukan lainnya",
        1350000,
        "Hasil jual tablet lama ke rekan kerja",
      ],
      [
        10,
        9,
        "expense",
        "main",
        "Kesehatan",
        1675000,
        "Pemeriksaan mata dan lensa baru",
      ],
      [11, 3, "income", "main", "Gaji", 14850000, "THR dari Studio Arunika"],
      [
        11,
        16,
        "expense",
        "main",
        "Perjalanan",
        2863000,
        "Tiket mudik dan bagasi tambahan",
      ],
      [
        11,
        20,
        "expense",
        "main",
        "Keluarga dan hadiah",
        1465000,
        "Hampers untuk keluarga dan saudara saat Lebaran",
      ],
      [
        13,
        12,
        "expense",
        "studio",
        "Pendidikan",
        1850000,
        "Lokakarya riset desain dua hari",
      ],
      [
        14,
        5,
        "expense",
        "main",
        "Hewan peliharaan",
        736000,
        "Perawatan Miko setelah gangguan pencernaan",
      ],
      [
        15,
        18,
        "expense",
        "main",
        "Perjalanan",
        2286000,
        "Penginapan dan sewa kendaraan di Malang",
      ],
      [
        17,
        15,
        "expense",
        "studio",
        "Kebutuhan kantor",
        4899000,
        "Ganti tablet gambar untuk produksi aset klien",
      ],
      [
        18,
        26,
        "income",
        "main",
        "Bisnis",
        975000,
        "Royalti penjualan template presentasi kuartal ketiga",
      ],
      [
        19,
        8,
        "expense",
        "main",
        "Hiburan",
        465000,
        "Dua tiket konser kecil di M Bloc",
      ],
      [
        19,
        12,
        "expense",
        "main",
        "Tempat tinggal",
        845000,
        "Ganti keran dapur dan ongkos pemasangan",
      ],
      [
        19,
        19,
        "expense",
        "main",
        "Hewan peliharaan",
        347000,
        "Pemeriksaan Miko dan obat kutu tiga bulan",
      ],
    ])
      plan(
        entry(
          type,
          wallet,
          name,
          amount,
          monthShift(opening, month, day),
          description,
        ),
      );

    const balances = new Map(
      Object.values(account).map((a) => [a.id, a.openingBalance]),
    );
    const reloads = new Map([
      [
        account.cash.id,
        ["cash", 250000, 500000, "Tarik tunai di ATM dekat stasiun"],
      ],
      [
        account.transport.id,
        ["transport", 200000, 450000, "Isi saldo GoPay untuk perjalanan kerja"],
      ],
      [
        account.wallet.id,
        ["wallet", 150000, 350000, "Isi saldo ShopeePay sebelum checkout"],
      ],
      [
        account.travel.id,
        ["travel", 150000, 250000, "Isi ulang Flazz lewat mobile banking"],
      ],
    ]);
    const posted = new Map();
    for (const tx of repo.list(uid, "transaction")) {
      if (!posted.has(tx.date)) posted.set(tx.date, []);
      posted.get(tx.date).push({ ...tx, amount: tx.amountMinor / 100 });
    }
    const adjust = (key, amount) =>
      balances.set(key, balances.get(key) + amount);
    const writeTransaction = async (tx) => {
      if (tx.type === "transfer") {
        adjust(tx.fromAccountId, -tx.amount);
        adjust(tx.toAccountId, tx.amount);
        return create("/transactions", tx, tx.date);
      }
      adjust(tx.accountId, tx.type === "income" ? tx.amount : -tx.amount);
      return create("/transactions", tx, tx.date);
    };
    for (let date = opening; date <= now; date = dateShift(date, 1)) {
      const fixed = posted.get(date) ?? [];
      const entries = planned.get(date) ?? [];
      const needed = new Map();
      for (const tx of [...fixed, ...entries]) {
        if (tx.type === "expense")
          needed.set(tx.accountId, (needed.get(tx.accountId) ?? 0) + tx.amount);
      }
      for (const [key, total] of needed) {
        const balance = balances.get(key);
        const reload = reloads.get(key);
        if (!reload || balance - total >= 20000) continue;
        const [wallet, min, max, description] = reload;
        const amount = Math.max(
          Math.ceil((total - balance + 20000) / 50000) * 50000,
          integer(min / 50000, max / 50000) * 50000,
        );
        await writeTransaction(
          transfer("main", wallet, amount, date, description),
        );
      }
      for (const tx of fixed)
        adjust(tx.accountId, tx.type === "income" ? tx.amount : -tx.amount);
      for (const tx of entries) await writeTransaction(tx);
    }
    await call("delete", `/categories/${category["Komuter lama"].id}`);
    for (const [description, date, categoryName, amount] of [
      ["Pesanan kopi tercatat dua kali", dateShift(now, -9), "Makanan", 41000],
      [
        "Nota servis duplikat dari bengkel",
        monthShift(now, -3, 13),
        "Transportasi",
        174000,
      ],
      [
        "Pembayaran marketplace dikembalikan sebelum barang dikirim",
        monthShift(now, -5, 6),
        "Belanja",
        186500,
      ],
    ]) {
      const tx = await create(
        "/transactions",
        entry("expense", "main", categoryName, amount, date, description),
        date,
      );
      await call("post", `/transactions/${tx.id}/void`);
    }
    const corrected = await create(
      "/transactions",
      entry(
        "expense",
        "main",
        "Makanan",
        82500,
        dateShift(now, -2),
        "Super Indo · bahan masakan akhir pekan",
      ),
    );
    await call("patch", `/transactions/${corrected.id}`, {
      amount: 78500,
      description: "Super Indo · bahan masakan setelah potongan member",
    });
    const bookedService = dateShift(now, -1);
    await create(
      "/transactions",
      entry(
        "expense",
        "main",
        "Rumah tangga",
        285000,
        bookedService,
        "QRIS · servis AC Cipete, pembayaran sebelum kunjungan",
      ),
      bookedService,
    );
    console.log("Riwayat transaksi harian dan transfer siap.");

    const goals = [
      [
        "Dana darurat enam bulan",
        55000000,
        "savings",
        18,
        2100000,
        12,
        "active",
      ],
      [
        "Liburan Kyoto dan Osaka",
        26500000,
        "savings",
        13,
        1150000,
        7,
        "active",
      ],
      ["Ganti laptop kerja", 18900000, "studio", 14, 1280000, 4, "active"],
      ["Uang muka rumah", 175000000, "savings", 19, 1850000, 38, "active"],
      ["Kursus bahasa Jepang N4", 7500000, null, 9, 490000, 4, "paused"],
      ["Dana kesehatan Miko", 4200000, "savings", 10, 245000, 9, "active"],
      [
        "Kacamata dan pemeriksaan mata",
        1750000,
        null,
        11,
        360000,
        -6,
        "completed",
      ],
      ["Dana pindahan apartemen", 7200000, "main", 18, 920000, -9, "completed"],
      ["Perjalanan ke Lombok", 12000000, null, 14, 370000, -2, "archived"],
      [
        "Printer untuk proyek rumahan",
        3900000,
        "studio",
        7,
        340000,
        5,
        "paused",
      ],
    ];
    for (const [
      name,
      targetAmount,
      wallet,
      age,
      amount,
      deadline,
      status,
    ] of goals) {
      const start = monthShift(now, -age);
      const targetDate = monthShift(now, deadline, 25);
      const goal = await create(
        "/goals",
        {
          name,
          targetAmount,
          targetDate,
          accountId: wallet ? account[wallet].id : null,
        },
        start,
      );
      const count =
        status === "active"
          ? age
          : status === "paused"
            ? age - 2
            : Math.max(4, age + deadline);
      let total = 0;
      for (let month = 0; month < count; month++) {
        const date = monthShift(start, month, integer(4, 19));
        const contribution =
          status === "completed"
            ? month === count - 1
              ? targetAmount - total
              : rounded((targetAmount / count) * (0.85 + random() * 0.2))
            : rounded(amount * (0.78 + random() * 0.47), 5000);
        total += contribution;
        await create(
          `/goals/${goal.id}/contributions`,
          {
            amount: contribution,
            date,
            note: pick([
              "Alokasi dari pendapatan bulan ini",
              "Pencatatan setelah dana dipisahkan",
              "Sisa kebutuhan bulanan dialihkan ke target",
              "Setoran rutin setelah menutup pengeluaran tetap",
            ]),
          },
          date,
        );
      }
      if (name === "Ganti laptop kerja") {
        const date = dateShift(now, -7);
        const c = await create(
          `/goals/${goal.id}/contributions`,
          {
            amount: 200000,
            date,
            note: "Setoran tambahan dari sisa honor proyek",
          },
          date,
        );
        await call("patch", `/goals/${goal.id}/contributions/${c.id}`, {
          amount: 275000,
        });
        const duplicate = await create(
          `/goals/${goal.id}/contributions`,
          {
            amount: 275000,
            date,
            note: "Pencatatan ganda dari mutasi tabungan",
          },
          date,
        );
        await call(
          "post",
          `/goals/${goal.id}/contributions/${duplicate.id}/void`,
        );
      }
      if (status !== "active")
        await call("patch", `/goals/${goal.id}`, { status });
    }

    const limits = {
      Makanan: 2650000,
      Transportasi: 750000,
      "Tempat tinggal": 4200000,
      "Sewa dan utilitas": 910000,
      "Rumah tangga": 520000,
      Belanja: 475000,
      Hiburan: 465000,
      Kesehatan: 490000,
      "Keluarga dan hadiah": 865000,
      "Hewan peliharaan": 510000,
      "Langganan digital": 465000,
      Perjalanan: 1850000,
    };
    const expenses = repo
      .list(uid, "transaction")
      .filter((tx) => tx.type === "expense" && tx.status === "active");
    const totals = new Map();
    for (const tx of expenses) {
      const key = tx.date.slice(0, 7) + tx.categoryId;
      totals.set(key, (totals.get(key) ?? 0) + tx.amountMinor / 100);
    }
    for (let month = 0; month < 20; month++) {
      const period = monthShift(opening, month).slice(0, 7);
      for (const [name, base] of Object.entries(limits)) {
        const categoryId = category[name].id;
        if (name === "Perjalanan" && !totals.has(period + categoryId)) continue;
        const limitAmount = rounded(
          base * (0.92 + month * 0.006 + random() * 0.16),
          25000,
        );
        await create(
          "/budgets",
          {
            categoryId,
            period,
            limitAmount,
            warningThreshold: pick([75, 80, 80, 85, 90]),
          },
          `${period}-01`,
        );
      }
    }

    const notifications = await call("get", "/notifications");
    const billsById = new Map(
      repo.list(uid, "bill").map((bill) => [bill.id, bill]),
    );
    const txById = new Map(
      repo.list(uid, "transaction").map((tx) => [tx.id, tx]),
    );
    const budgetById = new Map(
      repo.list(uid, "budget").map((budget) => [budget.id, budget]),
    );
    const expenseDates = new Map();
    for (const tx of expenses.sort((a, b) => a.date.localeCompare(b.date))) {
      const key = tx.date.slice(0, 7) + tx.categoryId;
      if (!expenseDates.has(key)) expenseDates.set(key, []);
      expenseDates.get(key).push(tx);
    }
    for (const notification of notifications) {
      const entity = notification.relatedEntityId;
      let date;
      if (notification.type === "bill") {
        const bill = billsById.get(entity);
        const state = notification.dedupeKey.split(":").at(-1);
        date = dateShift(
          bill.dueDate,
          state === "overdue" ? 1 : state === "today" ? 0 : -bill.reminderDays,
        );
        const payment = txById.get(bill.paidTransactionId);
        // Staging replays payments in bulk, which can emit a reminder that would
        // have been superseded before the real payment date.
        if (payment && date > payment.date) {
          repo.remove(uid, "notification", notification.id);
          continue;
        }
      } else if (notification.type === "budget") {
        const budget = budgetById.get(entity);
        const threshold = notification.dedupeKey.endsWith(":100")
          ? 100
          : budget.warningThreshold;
        let spent = 0;
        date = expenseDates
          .get(budget.period + budget.categoryId)
          .find((tx) => {
            spent += tx.amountMinor;
            return spent >= (budget.limitAmountMinor * threshold) / 100;
          }).date;
      } else {
        date = notification.dedupeKey.split(":").at(-1);
      }
      dates.set(notification.id, date);
      if (date < dateShift(now, -5) || chance(0.23))
        await call("patch", `/notifications/${notification.id}/read`);
    }
    // Replay historical reminders on the actual day they would have been sent.
    for (const bill of billsById.values()) {
      const payment = txById.get(bill.paidTransactionId);
      if (!payment) continue;
      const reminder = dateShift(bill.dueDate, -bill.reminderDays);
      if (reminder >= payment.date) continue;
      const key = `bill:${bill.id}:upcoming`;
      scheduled.notify(
        uid,
        "bill",
        "Pengingat tagihan",
        `${bill.name} jatuh tempo ${bill.dueDate}.`,
        bill.id,
        key,
      );
      const notification = db
        .prepare(
          "SELECT id FROM records WHERE user_id=? AND kind='notification' AND json_extract(data,'$.dedupeKey')=?",
        )
        .get(uid, key);
      dates.set(notification.id, reminder);
      if (payment.date < dateShift(now, -4))
        repo.update(uid, "notification", notification.id, { isRead: true });
    }

    const stamp = (date, minute = 0) =>
      new Date(Date.parse(date + "T01:00:00Z") + minute * 60000).toISOString();
    const crossDates = new Map([
      ...dates,
      ...Array.from(txById, ([id, tx]) => [id, tx.date]),
    ]);
    for (const bill of billsById.values()) {
      const payment = txById.get(bill.paidTransactionId);
      crossDates.set(
        bill.id,
        payment?.date ?? (bill.dueDate > now ? now : bill.dueDate),
      );
    }
    const timestamps = db.prepare(
      "UPDATE records SET created_at=?,updated_at=? WHERE id=? AND user_id=?",
    );
    for (const row of db
      .prepare(
        "SELECT id,kind,data FROM records WHERE user_id=? ORDER BY rowid",
      )
      .all(uid)) {
      const data = JSON.parse(row.data);
      const eventDate =
        crossDates.get(row.id) ??
        crossDates.get(data.entityId) ??
        data.date ??
        opening;
      let created = eventDate;
      let updated = eventDate;
      if (row.kind === "bill") {
        const payment = txById.get(data.paidTransactionId);
        created = dateShift(data.dueDate, -Math.max(6, data.reminderDays));
        if (payment) {
          updated = payment.date;
          repo.update(uid, "bill", row.id, { paidAt: stamp(updated, 540) });
        } else updated = created;
      } else if (row.kind === "recurring") {
        updated = data.lastRunAt ?? eventDate;
      } else if (row.kind === "account" && row.id === account.old.id) {
        updated = monthShift(opening, 4, 22);
      } else if (row.kind === "audit" && data.action === "archive") {
        created = updated = monthShift(opening, 4, 22);
      }
      const minute =
        row.kind === "audit"
          ? { create: 450, update: 530, void: 540, archive: 560, pay: 550 }[
              data.action
            ]
          : integer(0, 810);
      const bounded = (date) =>
        date > now ? now : date < opening ? opening : date;
      timestamps.run(
        stamp(bounded(created), minute),
        stamp(bounded(updated), minute + 1),
        row.id,
        uid,
      );
    }
    db.prepare("UPDATE users SET created_at=?,updated_at=? WHERE id=?").run(
      stamp(opening),
      stamp(now),
      uid,
    );
    await call("post", "/auth/logout");
    verifyDatabase(db);
    console.log(
      db
        .prepare(
          "SELECT kind,COUNT(*) AS total FROM records WHERE user_id=? GROUP BY kind ORDER BY kind",
        )
        .all(uid),
    );
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  } finally {
    db.close();
  }
}

const [mode, filename, target] = process.argv.slice(2);
assert(
  filename,
  "Gunakan stage <database> atau install <database-staging> <database-tujuan>.",
);
if (mode === "stage") {
  const password = process.env.FINANCETRACK_PORTFOLIO_PASSWORD;
  assert(
    password && password.length >= 10,
    "Tetapkan FINANCETRACK_PORTFOLIO_PASSWORD sebelum membuat akun.",
  );
  await stagePortfolio(resolve(filename), password);
} else if (mode === "install" && target) {
  installPortfolio(filename, target);
} else {
  throw new Error("Mode perintah tidak valid.");
}
