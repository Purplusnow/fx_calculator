const amountEl = document.getElementById("amount");
const fromEl = document.getElementById("fromCurrency");
const toEl = document.getElementById("toCurrency");
const convertBtn = document.getElementById("convertBtn");
const swapBtn = document.getElementById("swapBtn");
const loadRatesBtn = document.getElementById("loadRatesBtn");
const resultEl = document.getElementById("result");
const rateMetaEl = document.getElementById("rateMeta");

let rates = null;          // { "USD": 1, "KRW": 1450.3, ... } (base: USD)
let lastUpdateUtc = null;  // string

// 유명 통화 상단 고정 순서
const PINNED = [
  "USD", "KRW", "JPY", "EUR", "GBP", "CNY", "HKD", "SGD",
  "CAD", "AUD", "CHF", "NZD", "SEK", "NOK", "DKK",
  "INR", "THB", "IDR", "VND", "PHP", "MYR",
  "TWD", "BRL", "MXN", "ZAR", "TRY", "AED", "SAR",
  "PLN", "CZK", "HUF", "ILS"
];

// 코드 → 표시명(국가/통화명). 자주 쓰는 것만 먼저 수록.
// 여기에 없는 코드는 자동으로 "CODE"만 표시.
const LABELS = {
  USD: "미국 달러",
  KRW: "대한민국 원",
  JPY: "일본 엔",
  EUR: "유로",
  GBP: "영국 파운드",
  CNY: "중국 위안",
  HKD: "홍콩 달러",
  SGD: "싱가포르 달러",
  CAD: "캐나다 달러",
  AUD: "호주 달러",
  CHF: "스위스 프랑",
  NZD: "뉴질랜드 달러",
  SEK: "스웨덴 크로나",
  NOK: "노르웨이 크로네",
  DKK: "덴마크 크로네",
  INR: "인도 루피",
  THB: "태국 바트",
  IDR: "인도네시아 루피아",
  VND: "베트남 동",
  PHP: "필리핀 페소",
  MYR: "말레이시아 링깃",
  TWD: "대만 달러",
  BRL: "브라질 헤알",
  MXN: "멕시코 페소",
  ZAR: "남아공 랜드",
  TRY: "터키 리라",
  AED: "UAE 디르함",
  SAR: "사우디 리얄",
  PLN: "폴란드 즈워티",
  CZK: "체코 코루나",
  HUF: "헝가리 포린트",
  ILS: "이스라엘 셰켈",
  RUB: "러시아 루블",
  UAH: "우크라이나 흐리우냐",
  KZT: "카자흐스탄 텡게",
  PKR: "파키스탄 루피",
  BDT: "방글라데시 타카",
  LKR: "스리랑카 루피",
  NPR: "네팔 루피",
  ARS: "아르헨티나 페소",
  CLP: "칠레 페소",
  COP: "콜롬비아 페소",
  PEN: "페루 솔",
  EGP: "이집트 파운드",
  MAD: "모로코 디르함",
  NGN: "나이지리아 나이라",
  KES: "케냐 실링"
};

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : NaN;
}

function fmtNumber(v) {
  if (!Number.isFinite(v)) return "";
  const fixed = Math.round(v * 1e6) / 1e6;
  return fixed.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function setMeta(text) {
  if (rateMetaEl) rateMetaEl.textContent = text || "";
}

function setResult(text) {
  if (resultEl) resultEl.textContent = text || "";
}

function getSelected(selectEl) {
  return (selectEl && selectEl.value) ? selectEl.value : null;
}

function optionLabel(code) {
  const name = LABELS[code];
  return name ? `${code} — ${name}` : code;
}

function buildCurrencyList(rateMap) {
  const allCodes = Object.keys(rateMap);

  // pinned 우선, 나머지는 알파벳 정렬
  const pinnedSet = new Set(PINNED);
  const pinned = PINNED.filter(c => allCodes.includes(c));
  const rest = allCodes.filter(c => !pinnedSet.has(c)).sort();

  return { pinned, rest };
}

function fillCurrencySelects(rateMap) {
  const { pinned, rest } = buildCurrencyList(rateMap);

  const fromDefault = pinned.includes("USD") ? "USD" : (pinned[0] || rest[0]);
  const toDefault = pinned.includes("KRW") ? "KRW" : (pinned.includes("JPY") ? "JPY" : (pinned[0] || rest[0]));

  const prevFrom = getSelected(fromEl) || fromDefault;
  const prevTo = getSelected(toEl) || toDefault;

  const makeOptions = (selected) => {
    const top = pinned.map(code =>
      `<option value="${code}"${code === selected ? " selected" : ""}>${optionLabel(code)}</option>`
    ).join("");

    const divider = `<option value="" disabled>──────────</option>`;

    const bottom = rest.map(code =>
      `<option value="${code}"${code === selected ? " selected" : ""}>${optionLabel(code)}</option>`
    ).join("");

    return top + (rest.length ? divider : "") + bottom;
  };

  fromEl.innerHTML = makeOptions(prevFrom);
  toEl.innerHTML = makeOptions(prevTo);
}

async function fetchRates() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);

  const data = await res.json();
  if (data.result !== "success") throw new Error("API failed");

  const map = data.rates;
  if (!map || typeof map !== "object") throw new Error("Bad rates");

  map.USD = 1;

  return {
    rates: map,
    lastUpdateUtc: data.time_last_update_utc || null
  };
}

async function loadRates({ silent = false } = {}) {
  try {
    if (!silent) {
      loadRatesBtn.disabled = true;
      loadRatesBtn.textContent = "불러오는 중...";
      setResult("환율을 불러오는 중입니다.");
    }

    setMeta("환율 불러오는 중...");
    const out = await fetchRates();

    rates = out.rates;
    lastUpdateUtc = out.lastUpdateUtc;

    fillCurrencySelects(rates);

    setMeta(lastUpdateUtc ? `업데이트(UTC): ${lastUpdateUtc}` : "업데이트 시간: 확인 불가");
    setResult("환율을 불러왔습니다. 금액과 통화를 선택한 뒤 변환하세요.");

    if (amountEl.value) convert();
  } catch (e) {
    setMeta("");
    setResult("환율을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  } finally {
    if (!silent) {
      loadRatesBtn.disabled = false;
      loadRatesBtn.textContent = "환율 다시 불러오기";
    }
  }
}

function convert() {
  if (!rates) {
    setResult("아직 환율이 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.");
    return;
  }

  const amount = n(amountEl.value);
  const from = getSelected(fromEl);
  const to = getSelected(toEl);

  if (!Number.isFinite(amount)) {
    setResult("금액을 올바르게 입력해 주세요.");
    return;
  }
  if (!from || !to) {
    setResult("통화를 선택해 주세요.");
    return;
  }

  const fromRate = Number(rates[from]);
  const toRate = Number(rates[to]);

  if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) {
    setResult("선택한 통화의 환율 데이터를 찾지 못했습니다. 환율을 다시 불러와 주세요.");
    return;
  }

  const converted = (amount / fromRate) * toRate;
  setResult(`${fmtNumber(amount)} ${from} = ${fmtNumber(converted)} ${to}`);
}

function swapCurrencies() {
  const a = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value = a;

  if (amountEl.value) convert();
}

// 이벤트 바인딩
convertBtn.addEventListener("click", convert);
swapBtn.addEventListener("click", swapCurrencies);
loadRatesBtn.addEventListener("click", () => loadRates({ silent: false }));

amountEl.addEventListener("keydown", (e) => { if (e.key === "Enter") convert(); });
fromEl.addEventListener("change", () => { if (amountEl.value) convert(); });
toEl.addEventListener("change", () => { if (amountEl.value) convert(); });

// 페이지 로딩 시 자동으로 환율 불러오기
loadRates({ silent: true });
