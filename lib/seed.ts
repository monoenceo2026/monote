import type { Database } from "better-sqlite3";

/* deterministic RNG so the seeded platform is reproducible */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const CONDITIONS: Array<[string, string]> = [
  ["process", "板金・プレス"],
  ["process", "切削・機械加工"],
  ["process", "溶接"],
  ["process", "表面処理・熱処理"],
  ["process", "鋳造・鍛造"],
  ["process", "樹脂成形"],
  ["process", "組立"],
  ["process", "検査・測定"],
  ["process", "繊維・染色"],
  ["material", "ステンレス"],
  ["material", "鉄・鋼"],
  ["material", "アルミ"],
  ["material", "銅・真鍮"],
  ["material", "樹脂"],
  ["material", "繊維・布"],
  ["lot", "1個から（試作）"],
  ["lot", "小ロット（〜100個）"],
  ["lot", "〜1,000個"],
  ["lot", "量産（1,000個以上）"],
  ["delivery", "短納期（7日以内）"],
  ["cert", "ISO9001"],
  ["cert", "ISO14001"],
  ["cert", "IATF16949"],
  ["area", "関西"],
  ["area", "関東"],
  ["area", "全国対応"],
  ["precision", "高精度±0.01mm"],
];

const PREFIX = ["協和", "東和", "大進", "山田", "中村", "富士見", "旭", "栄光", "三共", "北斗", "泉州", "浪速", "堺", "京北", "近江", "尾張", "美濃", "甲信", "常磐", "湘南", "武蔵", "多摩"];
const SUFFIX = ["製作所", "金属工業", "精機", "工業", "テック", "鉄工所", "プレス工業", "樹脂工業", "精密", "合金"];
const KANSAI = ["大阪府", "兵庫県", "京都府", "滋賀県", "奈良県"];
const KANTO = ["東京都", "神奈川県", "埼玉県", "千葉県", "茨城県"];
const CITY: Record<string, string[]> = {
  大阪府: ["八尾市", "東大阪市", "堺市", "岸和田市", "門真市"],
  兵庫県: ["尼崎市", "姫路市", "西宮市", "明石市"],
  京都府: ["京都市", "宇治市", "長岡京市"],
  滋賀県: ["草津市", "彦根市"],
  奈良県: ["奈良市", "大和郡山市"],
  東京都: ["大田区", "墨田区", "八王子市"],
  神奈川県: ["川崎市", "横浜市", "相模原市"],
  埼玉県: ["川口市", "さいたま市"],
  千葉県: ["船橋市", "市川市"],
  茨城県: ["日立市", "つくば市"],
};

function iso(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export function runSeed(db: Database) {
  const insCond = db.prepare("INSERT OR IGNORE INTO conditions (category, label) VALUES (?, ?)");
  for (const [c, l] of CONDITIONS) insCond.run(c, l);
  const condId = new Map<string, number>();
  for (const row of db.prepare("SELECT id, category, label FROM conditions").all() as any[]) {
    condId.set(row.category + ":" + row.label, row.id);
  }

  const insCompany = db.prepare(`INSERT INTO companies
    (slug, name, verified, prefecture, city, employees, founded, description,
     specialty_process, specialty_process_sub, specialty_lot, specialty_lot_sub,
     specialty_quality, specialty_quality_sub,
     lot_min, lot_max, precision_mm, delivery_min, delivery_max, size_note, equipment,
     capacity, industries, area, price_hint, contact_hours, hard_conditions,
     response_days, trade_terms, address, completeness, profile_confirmed_at, updated_at)
    VALUES (@slug,@name,@verified,@prefecture,@city,@employees,@founded,@description,
     @sp,@sps,@sl,@sls,@sq,@sqs,
     @lot_min,@lot_max,@precision_mm,@delivery_min,@delivery_max,@size_note,@equipment,
     @capacity,@industries,@area,@price_hint,@contact_hours,@hard_conditions,
     @response_days,@trade_terms,@address,@completeness,@confirmed,@updated)`);
  const insCC = db.prepare("INSERT OR IGNORE INTO company_conditions (company_id, condition_id) VALUES (?, ?)");
  const insPhoto = db.prepare("INSERT INTO company_photos (company_id, path, sort) VALUES (?, ?, ?)");
  const insWork = db.prepare("INSERT INTO works (company_id, title, spec) VALUES (?, ?, ?)");
  const insArticle = db.prepare(`INSERT INTO articles
    (slug, company_id, title, excerpt, body, theme, status, reviewed, read_minutes, tag1, tag2, published_at, updated_at)
    VALUES (@slug,@company_id,@title,@excerpt,@body,@theme,'published',@reviewed,@read_minutes,@tag1,@tag2,@published_at,@updated)`);
  const insAC = db.prepare("INSERT OR IGNORE INTO article_conditions (article_id, condition_id) VALUES (?, ?)");
  const insEvent = db.prepare("INSERT INTO events (type, company_id, article_id, term, created_at) VALUES (?, ?, ?, ?, ?)");
  const insUser = db.prepare("INSERT INTO users (email, name, role, company_id) VALUES (?, ?, ?, ?)");

  const link = (companyId: number, key: string) => {
    const id = condId.get(key);
    if (id) insCC.run(companyId, id);
  };

  const tx = db.transaction(() => {
    /* ---------- flagship companies (Figma copy) ---------- */
    const marumaru = insCompany.run({
      slug: "marumaru-seisakusho",
      name: "株式会社○○製作所",
      verified: 1,
      prefecture: "大阪府",
      city: "八尾市",
      employees: "30〜99名",
      founded: 1968,
      description: "ステンレス薄板の精密板金、1個の試作から2,000個までを、同じ設備・同じ担当で通して受けています。",
      sp: "ステンレス薄板の精密板金", sps: "レーザー切断／曲げ／TIG溶接",
      sl: "1個〜2,000個／最短5日", sls: "試作と量産を同じ担当が通じて対応",
      sq: "ISO9001／全数寸法検査", sqs: "試作と量産を同じ担当が通じて対応",
      lot_min: 1, lot_max: 2000, precision_mm: 0.05, delivery_min: 5, delivery_max: 10,
      size_note: "板金0.5〜0.6mm／最大1,500mm×3,000mm",
      equipment: "ファイバーレーザー3台／ベンダー4台／三次元測定機1台",
      capacity: "月産 約12,000個（2交替）",
      industries: "半導体製造装置／医療機器／食品機械／鉄道",
      area: "全国発送／標準 5〜10日／特急 応相談",
      price_hint: "試作 3万円〜／量産は図面ベースで個別見積",
      contact_hours: "平日9:00〜17:30／相談への返信 平均1営業日",
      hard_conditions: "板厚6.0mm超の切断／鋳物･樹脂の加工／10,000個以上の大量量産／めっき･塗装（協力会社へ手配）",
      response_days: 1, trade_terms: "初回前払／掛け取引は与信後",
      address: "大阪府八尾市○○町1-2", completeness: 72,
      confirmed: "2026-07-15 09:00:00", updated: "2026-08-05 10:00:00",
    }).lastInsertRowid as number;
    ["process:板金・プレス", "process:溶接", "process:組立", "material:ステンレス", "material:鉄・鋼", "material:アルミ", "lot:1個から（試作）", "lot:小ロット（〜100個）", "lot:〜1,000個", "delivery:短納期（7日以内）", "cert:ISO9001", "cert:ISO14001", "area:関西", "area:全国対応"].forEach((k) => link(marumaru, k));
    ["a1", "a2", "a3", "a4", "a5", "a6"].forEach((n, i) => insPhoto.run(marumaru, `/assets/img/search-photo-${n}.jpg`, i));
    insWork.run(marumaru, "半導体装置向け SUS304カバー", "材質 SUS304／板厚 1.5mm／ロット 20個／納期 6日");
    insWork.run(marumaru, "医療機器筐体の試作から量産移行", "材質 SUS316／板厚 1.0mm／ロット 1→800個");
    insWork.run(marumaru, "食品機械 部品のコスト30%削減", "材質 SUS304／板厚 2.0mm／溶接工程の見直し");

    const kinzoku = insCompany.run({
      slug: "kinzoku-kogyo",
      name: "○○金属工業株式会社",
      verified: 1,
      prefecture: "兵庫県", city: "尼崎市", employees: "10〜29名", founded: 1982,
      description: "プレスとスポット溶接を中心に、建材・産業機械向けの板金部品を手がけています。",
      sp: "ステンレス薄板の精密板金", sps: "プレス／曲げ／スポット溶接",
      sl: "1個〜500個／最短10日", sls: "試作と量産を同じ担当が通じて対応",
      sq: "ISO9001", sqs: "受入検査と出荷前の抜取検査",
      lot_min: 1, lot_max: 500, precision_mm: 0.1, delivery_min: 10, delivery_max: 14,
      size_note: "板厚0.8〜4.0／1,200×2,400m", equipment: "プレス機5台／スポット溶接機3台",
      capacity: "月産 約8,000個", industries: "建材／産業機械",
      area: "関西中心／全国可", price_hint: "試作 2.5万円〜",
      contact_hours: "平日9:00〜18:00／相談への返信 平均3営業日",
      hard_conditions: "精密公差±0.05mm未満／樹脂・鋳物", response_days: 3,
      trade_terms: "応相談", address: "兵庫県尼崎市○○1-8", completeness: 58,
      confirmed: "2026-06-20 09:00:00", updated: "2026-07-22 10:00:00",
    }).lastInsertRowid as number;
    ["process:板金・プレス", "process:溶接", "material:ステンレス", "material:鉄・鋼", "lot:1個から（試作）", "lot:小ロット（〜100個）", "cert:ISO9001", "area:関西", "area:全国対応"].forEach((k) => link(kinzoku, k));
    ["b1", "b2", "b3", "b4", "b5", "b6"].forEach((n, i) => insPhoto.run(kinzoku, `/assets/img/search-photo-${n}.jpg`, i));

    const seiki = insCompany.run({
      slug: "seiki",
      name: "○○精機",
      verified: 0,
      prefecture: "大阪府", city: "東大阪市", employees: "10〜29名", founded: 1990,
      description: "レーザー切断と曲げ加工を中心に、産業機械向け部品を少量から対応しています。",
      sp: "レーザー切断と曲げ加工", sps: "レーザー切断／曲げ",
      sl: "10個〜300個", sls: "小ロットの繰り返し発注に対応",
      sq: "自主検査のみ", sqs: "出荷前の自主検査",
      lot_min: 10, lot_max: 300, precision_mm: 0.1, delivery_min: 14, delivery_max: 21,
      size_note: "板厚1.0〜3.0／1,000×2,000m", equipment: "レーザー加工機2台／ベンダー2台",
      capacity: "月産 約3,000個", industries: "産業機械",
      area: "関西のみ", price_hint: "非公開",
      contact_hours: "平日10:00〜17:00", hard_conditions: "量産・特急対応",
      response_days: null, trade_terms: "応相談", address: "大阪府東大阪市○○2-4", completeness: 41,
      confirmed: null, updated: "2026-05-11 10:00:00",
    }).lastInsertRowid as number;
    ["process:板金・プレス", "process:切削・機械加工", "material:ステンレス", "material:アルミ", "lot:小ロット（〜100個）", "area:関西"].forEach((k) => link(seiki, k));

    const giken = insCompany.run({
      slug: "giken",
      name: "株式会社○○技研",
      verified: 1,
      prefecture: "大阪府", city: "堺市", employees: "30〜99名", founded: 1975,
      description: "アルミの表面処理・アルマイトを中心に、色ムラの少ない量産処理を得意としています。",
      sp: "アルマイト・表面処理", sps: "アルマイト／化成処理／脱脂",
      sl: "10個〜10,000個", sls: "量産ロットの色調管理",
      sq: "ISO9001／色差検査", sqs: "限度見本と色差計で管理",
      lot_min: 10, lot_max: 10000, precision_mm: null, delivery_min: 7, delivery_max: 14,
      size_note: "最大1,200×2,000mm", equipment: "アルマイト処理槽2ライン",
      capacity: "月産 約40,000個", industries: "自動車／家電",
      area: "全国対応", price_hint: "ロット単価は数量ベースで見積",
      contact_hours: "平日9:00〜17:00", hard_conditions: "部分マスキングの複雑形状",
      response_days: 2, trade_terms: "掛け取引可", address: "大阪府堺市○○3-6", completeness: 66,
      confirmed: "2026-07-01 09:00:00", updated: "2026-08-05 10:00:00",
    }).lastInsertRowid as number;
    ["process:表面処理・熱処理", "material:アルミ", "lot:小ロット（〜100個）", "lot:量産（1,000個以上）", "cert:ISO9001", "area:関西", "area:全国対応"].forEach((k) => link(giken, k));

    const sensen = insCompany.run({
      slug: "sensen",
      name: "○○晒染",
      verified: 0,
      prefecture: "京都府", city: "京都市", employees: "10〜29名", founded: 1955,
      description: "繊維の染色加工。設備の組み替えで小ロットの染色に対応しています。",
      sp: "繊維の染色・晒し", sps: "反応染め／晒し",
      sl: "小ロット〜量産", sls: "染色ロットの下限を引き下げ",
      sq: "色堅牢度試験", sqs: "外部試験機関と連携",
      lot_min: 50, lot_max: 50000, precision_mm: null, delivery_min: 10, delivery_max: 21,
      size_note: "生地幅〜1,800mm", equipment: "液流染色機3台",
      capacity: "月産 約80,000m", industries: "アパレル／資材",
      area: "全国対応", price_hint: "加工賃は数量ベース",
      contact_hours: "平日9:00〜17:00", hard_conditions: "特殊糸・混率不明の生地",
      response_days: 2, trade_terms: "応相談", address: "京都府京都市○○4-1", completeness: 48,
      confirmed: null, updated: "2026-07-27 10:00:00",
    }).lastInsertRowid as number;
    ["process:繊維・染色", "material:繊維・布", "lot:小ロット（〜100個）", "lot:量産（1,000個以上）", "area:関西", "area:全国対応"].forEach((k) => link(sensen, k));

    /* ---------- generated companies (total 128) ---------- */
    const rand = rng(20260830);
    const targetSUS = 48; // ステンレス×板金×1個から
    const targetFast = 24; // …かつ 短納期
    let susCount = 2; // marumaru, kinzoku
    let fastCount = 1; // marumaru
    const usedNames = new Set<string>();
    for (let i = 0; i < 123; i++) {
      let name = "";
      do {
        name = PREFIX[Math.floor(rand() * PREFIX.length)] + SUFFIX[Math.floor(rand() * SUFFIX.length)];
      } while (usedNames.has(name));
      usedNames.add(name);
      const kansai = rand() < 0.55;
      const prefecture = (kansai ? KANSAI : KANTO)[Math.floor(rand() * 5)];
      const city = CITY[prefecture][Math.floor(rand() * CITY[prefecture].length)];
      const inSUS = susCount < targetSUS && rand() < (targetSUS - susCount) / (123 - i);
      const inFast = inSUS && fastCount < targetFast && rand() < (targetFast - fastCount) / Math.max(1, targetSUS - susCount);
      if (inSUS) susCount++;
      if (inFast) fastCount++;

      const processes: string[] = inSUS
        ? ["板金・プレス"]
        : [CONDITIONS.filter(([c]) => c === "process")[Math.floor(rand() * 9)][1]];
      if (rand() < 0.4) processes.push(["溶接", "組立", "検査・測定", "切削・機械加工"][Math.floor(rand() * 4)]);
      const materials: string[] = inSUS ? ["ステンレス"] : [];
      if (!inSUS || rand() < 0.5) materials.push(["鉄・鋼", "アルミ", "ステンレス", "樹脂", "銅・真鍮", "繊維・布"][Math.floor(rand() * 6)]);
      const lots: string[] = inSUS ? ["1個から（試作）", "小ロット（〜100個）"] : [];
      if (!inSUS) lots.push(["1個から（試作）", "小ロット（〜100個）", "〜1,000個", "量産（1,000個以上）"][Math.floor(rand() * 4)]);

      const deliveryMin = inFast ? 3 + Math.floor(rand() * 4) : 8 + Math.floor(rand() * 10);
      const precision = rand() < 0.3 ? 0.01 : rand() < 0.6 ? 0.05 : 0.1;
      const lotMax = [300, 500, 1000, 2000, 5000][Math.floor(rand() * 5)];
      const founded = 1955 + Math.floor(rand() * 55);
      const daysAgo = Math.floor(rand() * 90);
      const procMain = processes[0];

      const id = insCompany.run({
        slug: `c-${String(i + 6).padStart(3, "0")}`,
        name: name.includes("株式") ? name : (rand() < 0.5 ? "株式会社" + name : name),
        verified: rand() < 0.6 ? 1 : 0,
        prefecture, city,
        employees: ["1〜9名", "10〜29名", "30〜99名", "100名以上"][Math.floor(rand() * 4)],
        founded,
        description: `${procMain}を中心に、${materials[0] ?? "各種素材"}の加工を${lots[0] ?? "小ロット"}から受けています。`,
        sp: `${materials[0] ?? ""}の${procMain}`, sps: processes.join("／"),
        sl: `${inSUS ? 1 : 10}個〜${lotMax.toLocaleString()}個／最短${deliveryMin}日`, sls: "繰り返し発注にも対応",
        sq: rand() < 0.5 ? "ISO9001" : "自主検査", sqs: "出荷前検査を実施",
        lot_min: inSUS ? 1 : 10, lot_max: lotMax, precision_mm: precision,
        delivery_min: deliveryMin, delivery_max: deliveryMin + 5 + Math.floor(rand() * 7),
        size_note: "", equipment: "", capacity: "",
        industries: ["産業機械", "自動車", "半導体製造装置", "建材", "家電", "医療機器"][Math.floor(rand() * 6)],
        area: kansai ? "関西中心／全国可" : "関東中心／全国可",
        price_hint: rand() < 0.5 ? `試作 ${(1 + Math.floor(rand() * 5)) * 10000 / 10000}万円〜` : "非公開",
        contact_hours: "平日9:00〜17:00",
        hard_conditions: "", response_days: 1 + Math.floor(rand() * 4),
        trade_terms: "応相談", address: `${prefecture}${city}`, completeness: 30 + Math.floor(rand() * 60),
        confirmed: rand() < 0.6 ? iso(30 + Math.floor(rand() * 60)) : null,
        updated: iso(daysAgo),
      }).lastInsertRowid as number;

      processes.forEach((p) => link(id, "process:" + p));
      materials.forEach((m) => link(id, "material:" + m));
      lots.forEach((l) => link(id, "lot:" + l));
      if (inFast) link(id, "delivery:短納期（7日以内）");
      if (rand() < 0.55) link(id, "cert:ISO9001");
      if (rand() < 0.15) link(id, "cert:ISO14001");
      if (precision === 0.01) link(id, "precision:高精度±0.01mm");
      link(id, "area:" + (kansai ? "関西" : "関東"));
      if (rand() < 0.5) link(id, "area:全国対応");
    }

    /* ---------- flagship articles (Figma copy) ---------- */
    const bodyOf = (sections: Array<{ heading: string; paragraphs: string[] }>) => JSON.stringify(sections);
    const flagshipArticles: Array<any> = [
      {
        slug: "sus304-bending-r",
        company_id: marumaru,
        title: "SUS304の曲げ割れを減らすために、設計段階でR指定をどう相談してほしいか",
        excerpt: "試作の板金でいちばん多い手戻りが、曲げ割れです。材質と板厚が決まっていても、曲げRの指定が図面に無いと、こちらで推定するしかありません。この記事では、当社が実際に受けた依頼をもとに…",
        theme: "case", reviewed: 1, read_minutes: 5, tag1: "板金・プレス", tag2: "ステンレス SUS304",
        published_at: "2026-07-18 10:00:00", updated: "2026-08-02 10:00:00",
        body: bodyOf([
          { heading: "板厚1.0mmのSUS304で、最初に確認していること", paragraphs: ["曲げ線と圧延方向の関係、そして内Rの指定があるかどうかを最初に確認します。指定が無い場合は板厚と同じRを仮置きし、試作の1個目で割れの兆候を見ます。", "圧延方向に平行な曲げは割れやすく、同じ図面でも取り都合によって結果が変わります。ネスティングの段階で曲げ線が方向に直交するよう配置できるか、材料取りとあわせて検討します。"] },
          { heading: "R指定が無いときに、当社が推定する順番", paragraphs: ["1) 板厚と同じ内R、2) 使用環境からの応力想定、3) 過去の類似案件、の順で推定します。推定の根拠は見積書に書き添えるようにしています。", "推定のまま量産に入ると、ロットによる材料の硬さの差で割れが出ることがあります。量産前に一度だけ、R指定の確定について相談させてもらえると手戻りが減ります。"] },
        ]),
        conditions: ["material:ステンレス", "process:板金・プレス", "lot:1個から（試作）", "precision:高精度±0.01mm"],
      },
      {
        slug: "anodize-color-uneven",
        company_id: giken,
        title: "削る・切るアルマイトの色ムラを抑えるために、前処理で変えた3つのこと",
        excerpt: "アルマイトの色ムラは、処理槽よりも前処理で決まることが多い、というのが現場の実感です。",
        theme: "case", reviewed: 1, read_minutes: 4, tag1: "表面処理", tag2: "アルミ",
        published_at: "2026-08-05 10:00:00", updated: "2026-08-05 10:00:00",
        body: bodyOf([
          { heading: "色ムラの原因は前処理にある", paragraphs: ["脱脂の温度管理、エッチング時間、ラック掛けの接点位置。この3つを変えるだけで、色ムラの発生率は大きく下がりました。"] },
          { heading: "量産ロットでの色調管理", paragraphs: ["限度見本と色差計を併用し、ロットごとの色差をデータで残しています。"] },
        ]),
        conditions: ["material:アルミ", "process:表面処理・熱処理"],
      },
      {
        slug: "sheetmetal-quick-quote",
        company_id: marumaru,
        title: "1個から受ける板金試作、見積が早い会社は何を決めているか",
        excerpt: "見積の速さは、社内の標準化で決まります。当社が見積前に決めている項目を公開します。",
        theme: "explain", reviewed: 1, read_minutes: 4, tag1: "板金", tag2: "小ロット",
        published_at: "2026-08-03 10:00:00", updated: "2026-08-03 10:00:00",
        body: bodyOf([
          { heading: "見積が早い会社の共通点", paragraphs: ["材質・板厚・数量・納期の4点が揃っていれば、当社は1営業日で見積を返せます。逆にどれかが「相談して決めたい」場合は、その前提を仮置きして2案出すようにしています。"] },
          { heading: "図面がなくても始められる", paragraphs: ["ポンチ絵と寸法だけでも、可否と概算は返せます。"] },
        ]),
        conditions: ["material:ステンレス", "process:板金・プレス", "lot:1個から（試作）", "delivery:短納期（7日以内）"],
      },
      {
        slug: "inspection-line",
        company_id: seiki,
        title: "全数検査と抜取検査、医療部品でどう線を引いているか",
        excerpt: "検査コストと品質保証のバランスを、当社の実例で説明します。",
        theme: "quality", reviewed: 0, read_minutes: 6, tag1: "検査", tag2: "ISO9001",
        published_at: "2026-07-29 10:00:00", updated: "2026-07-29 10:00:00",
        body: bodyOf([
          { heading: "全数検査に切り替える基準", paragraphs: ["嵌合部の公差が±0.05mmを切る場合と、医療・食品に触れる部位は全数検査に切り替えています。"] },
          { heading: "抜取検査で十分なケース", paragraphs: ["外観のみの要求で、工程能力指数が1.33を超えている工程は抜取に。"] },
        ]),
        conditions: ["process:検査・測定", "cert:ISO9001"],
      },
      {
        slug: "dye-lot-minimum",
        company_id: sensen,
        title: "染色ロットの下限を下げるために設備をどう組み替えたか",
        excerpt: "小ロット需要に応えるための設備の組み替えと、その限界について。",
        theme: "equipment", reviewed: 0, read_minutes: 5, tag1: "繊維", tag2: "量産",
        published_at: "2026-07-27 10:00:00", updated: "2026-07-27 10:00:00",
        body: bodyOf([
          { heading: "小型染色機の導入", paragraphs: ["最小50mから受けられるよう、小型の液流染色機を1台専用化しました。"] },
          { heading: "色再現の課題", paragraphs: ["小ロットは浴比が変わるため、量産と同じレシピでは色が合いません。換算表を整備しました。"] },
        ]),
        conditions: ["process:繊維・染色", "material:繊維・布"],
      },
      {
        slug: "welding-distortion",
        company_id: marumaru,
        title: "溶接ひずみを設計側で減らす3つのポイント",
        excerpt: "溶接ひずみは、溶接前の設計段階で大半が決まります。",
        theme: "explain", reviewed: 1, read_minutes: 4, tag1: "溶接", tag2: "板金",
        published_at: "2026-06-24 10:00:00", updated: "2026-06-24 10:00:00",
        body: bodyOf([
          { heading: "ひずみの出やすい形状", paragraphs: ["薄板の長い直線ビードは、それだけでひずみます。断続溶接への変更を相談できると仕上がりが安定します。"] },
        ]),
        conditions: ["process:溶接", "process:板金・プレス"],
      },
      {
        slug: "drawing-quote-speed",
        company_id: marumaru,
        title: "板金の見積が遅くなる図面、早くなる図面",
        excerpt: "同じ部品でも、図面の描き方ひとつで見積のスピードは変わります。",
        theme: "explain", reviewed: 1, read_minutes: 3, tag1: "見積", tag2: "板金",
        published_at: "2026-08-08 10:00:00", updated: "2026-08-08 10:00:00",
        body: bodyOf([
          { heading: "展開できない図面が最も遅い", paragraphs: ["曲げ部の内Rと板厚の記載があるだけで、展開検討の往復が1回減ります。"] },
        ]),
        conditions: ["process:板金・プレス", "material:ステンレス"],
      },
    ];

    const articleIds: number[] = [];
    for (const a of flagshipArticles) {
      const id = insArticle.run({
        slug: a.slug, company_id: a.company_id, title: a.title, excerpt: a.excerpt,
        body: a.body, theme: a.theme, reviewed: a.reviewed, read_minutes: a.read_minutes,
        tag1: a.tag1, tag2: a.tag2, published_at: a.published_at, updated: a.updated,
      }).lastInsertRowid as number;
      articleIds.push(id);
      for (const c of a.conditions) {
        const cid = condId.get(c);
        if (cid) insAC.run(id, cid);
      }
    }

    /* ---------- generated articles (total 342 published) ---------- */
    const materialsList = ["SUS304", "SUS316", "A5052", "SPCC", "C2801", "PPS樹脂", "綿ブロード"];
    const problems = ["反りを抑える", "バリを減らす", "納期を半分にする", "コストを3割下げる", "公差±0.05mmを守る", "表面キズを防ぐ", "溶接ひずみを抑える", "検査工数を減らす"];
    const actions = ["治具を作り直した話", "工程順を入れ替えた理由", "設備を1台専用化した結果", "図面の指示を変えてもらった事例", "前処理を見直した記録", "抜取検査の基準を変えた話"];
    const themes = ["case", "equipment", "quality", "people", "explain"];
    const companyRows = db.prepare("SELECT id, name FROM companies").all() as Array<{ id: number; name: string }>;
    for (let i = 0; i < 335; i++) {
      const c = companyRows[Math.floor(rand() * companyRows.length)];
      const m = materialsList[Math.floor(rand() * materialsList.length)];
      const p = problems[Math.floor(rand() * problems.length)];
      const act = actions[Math.floor(rand() * actions.length)];
      const title = `${m}で${p}ために、${act}`;
      const daysAgo = Math.floor(rand() * 400);
      const id = insArticle.run({
        slug: `post-${String(i + 100)}`,
        company_id: c.id,
        title,
        excerpt: `${m}の加工で「${p}」という相談は少なくありません。現場で実際に効いた対策を記録します。`,
        body: bodyOf([
          { heading: "起きていた問題", paragraphs: [`${m}の加工で、${p}必要がありました。従来のやり方では限界があり、原因を工程ごとに切り分けるところから始めました。`] },
          { heading: "現場で変えたこと", paragraphs: [`結論としては、${act.replace(/話$|理由$|結果$|事例$|記録$/, "")}ことで安定しました。同じ課題をお持ちの方は、条件を添えてご相談ください。`] },
        ]),
        theme: themes[Math.floor(rand() * themes.length)],
        reviewed: rand() < 0.4 ? 1 : 0,
        read_minutes: 3 + Math.floor(rand() * 5),
        tag1: ["板金", "切削", "表面処理", "溶接", "検査", "繊維"][Math.floor(rand() * 6)],
        tag2: ["小ロット", "量産", "試作", "ISO9001", "短納期"][Math.floor(rand() * 5)],
        published_at: iso(daysAgo),
        updated: iso(Math.max(0, daysAgo - Math.floor(rand() * 10))),
      }).lastInsertRowid as number;
      const cs = CONDITIONS.filter(() => rand() < 0.12).slice(0, 4);
      for (const [cat, label] of cs) {
        const cid = condId.get(cat + ":" + label);
        if (cid) insAC.run(id, cid);
      }
    }

    /* ---------- users ---------- */
    insUser.run("tanaka@example.co.jp", "田中", "buyer", null);
    insUser.run("owner@marumaru.example.jp", "株式会社○○製作所", "company", marumaru);

    /* ---------- events for the dashboard (marumaru, W-08 numbers) ---------- */
    const terms: Array<[string, number, number, number, number]> = [
      ["SUS304 × 小ロット × 短納期", 312, 88, 14, 4],
      ["板金 × 半導体装置", 241, 52, 9, 2],
      ["ステンレス × 1個から", 198, 44, 7, 1],
      ["精密板金 × 医療機器", 163, 21, 4, 0],
      ["板金 × 特急 × 関西", 96, 9, 2, 0],
      ["", 274, 107, 0, 0],
    ];
    const addEvents = (type: string, term: string, n: number, spreadDays: number, offsetDays = 0) => {
      for (let i = 0; i < n; i++) {
        insEvent.run(type, marumaru, null, term, iso(offsetDays + Math.floor(rand() * spreadDays)));
      }
    };
    for (const [term, imp, clicks, saveN, inqN] of terms) {
      addEvents("impression", term, imp, 30);
      addEvents("click", term, clicks, 30);
      addEvents("save", term, saveN, 30);
      addEvents("inquiry", term, inqN, 30);
    }
    /* direct (non-search) page views so 検索経由 share lands near 78% (321 clicks / 412 total) */
    addEvents("view", "", 91, 30);
    /* previous month baselines: impressions 930 (+38%), views… clicks act as views */
    addEvents("impression", "", 930, 30, 31);
    addEvents("click", "", 340, 30, 31);
    addEvents("save", "", 24, 30, 31);
    addEvents("inquiry", "", 4, 30, 31);
    /* article views for よく読まれている記事 */
    const artViews: Array<[number, number, number, number]> = [
      [articleIds[0], 168, 12, 3],
      [articleIds[2], 121, 9, 2],
      [articleIds[5], 64, 3, 0],
    ];
    for (const [aid, views, saveN, inqN] of artViews) {
      for (let i = 0; i < views; i++) insEvent.run("article_view", marumaru, aid, "", iso(Math.floor(rand() * 30)));
      for (let i = 0; i < saveN; i++) insEvent.run("article_save", marumaru, aid, "", iso(Math.floor(rand() * 30)));
      for (let i = 0; i < inqN; i++) insEvent.run("article_inquiry", marumaru, aid, "", iso(Math.floor(rand() * 30)));
    }
    /* inquiry source breakdown 4/2/1 */
    ["search", "search", "search", "search", "article", "article", "compare"].forEach((src, i) => {
      insEvent.run("inquiry_source_" + src, marumaru, null, "", iso(1 + i * 3));
    });

    /* ---------- inbox: open inquiries for marumaru ---------- */
    const inq1 = db.prepare(`INSERT INTO inquiries
      (type, process, material, quantity, deadline, note, anonymous, contact_company, contact_name, contact_email, source, created_at)
      VALUES ('estimate','板金・レーザー切断／曲げ','ステンレス SUS304（t1.5）','20個（試作）','2026年8月25日まで','現行品の曲げ割れを改善したく、Rの指定から相談したいです。',1,'株式会社△△','田中','tanaka@example.co.jp','search', ?)`)
      .run(iso(1)).lastInsertRowid as number;
    db.prepare("INSERT INTO inquiry_recipients (inquiry_id, company_id, status) VALUES (?, ?, 'open')").run(inq1, marumaru);
    const inq2 = db.prepare(`INSERT INTO inquiries
      (type, process, material, quantity, deadline, note, anonymous, contact_company, contact_name, contact_email, source, created_at)
      VALUES ('technical','曲げ・ベンダー','ステンレス SUS304','','','技術相談：曲げRの指定について',1,'株式会社△△','田中','tanaka@example.co.jp','article', ?)`)
      .run(iso(3)).lastInsertRowid as number;
    db.prepare("INSERT INTO inquiry_recipients (inquiry_id, company_id, status) VALUES (?, ?, 'open')").run(inq2, marumaru);
    for (let i = 0; i < 5; i++) {
      const id = db.prepare(`INSERT INTO inquiries (type, process, material, quantity, note, anonymous, contact_company, contact_name, contact_email, source, created_at)
        VALUES ('estimate','板金','SUS304','${(i + 1) * 10}個','過去の相談（返信済み）',1,'株式会社△△','田中','tanaka@example.co.jp','search', ?)`)
        .run(iso(6 + i * 5)).lastInsertRowid as number;
      db.prepare("INSERT INTO inquiry_recipients (inquiry_id, company_id, status) VALUES (?, ?, 'replied')").run(id, marumaru);
    }

    /* ---------- buyer's saved items / compare list (design counts) ---------- */
    const buyerSession = "user-1";
    const saveIns = db.prepare("INSERT OR IGNORE INTO saves (session_id, kind, target_id, created_at) VALUES (?, ?, ?, ?)");
    const companies8 = db.prepare("SELECT id FROM companies LIMIT 8").all() as Array<{ id: number }>;
    companies8.forEach((c, i) => saveIns.run(buyerSession, "company", c.id, iso(2 + i)));
    [articleIds[0], articleIds[6], articleIds[3], articleIds[1], articleIds[5]].forEach((aid, i) =>
      saveIns.run(buyerSession, "article", aid, iso(20 + i)));
    const cmpIns = db.prepare("INSERT OR IGNORE INTO compares (session_id, company_id, memo, created_at) VALUES (?, ?, ?, ?)");
    cmpIns.run(buyerSession, marumaru, "図面送付済み。R指定を要確認", iso(2));
    cmpIns.run(buyerSession, kinzoku, "", iso(2));
    cmpIns.run(buyerSession, seiki, "", iso(2));
  });

  tx();
}
