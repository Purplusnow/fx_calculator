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

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : NaN;
}

function fmtNumber(v) {
  if (!Number.isFinite(v)) return "";
  // 너무 긴 소수 방지: 최대 6자리 소수, 불필요한 0 제거
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

function fillCurrencySelects(rateMap) {
  const codes = Object.keys(rateMap).sort();

  const makeOptions = (selected) =>
    codes.map(code => `<option value="${code}"${code === selected ? " selected" : ""}>${code}</option>`).join("");

  // 기본값: from=USD, to=KRW
  const fromDefault = codes.includes("USD") ? "USD" : codes[0];
  const toDefault = codes.includes("KRW") ? "KRW" : (codes.includes("JPY") ? "JPY" : codes[0]);

  const prevFrom = getSelected(fromEl) || fromDefault;
  const prevTo = getSelected(toEl) || toDefault;

  fromEl.innerHTML = makeOptions(prevFrom);
  toEl.innerHTML = makeOptions(prevTo);
}

async function fetchRates() {
  // open.er-api.com: base USD 최신 환율
  const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);

  const data = await res.json();
  if (data.result !== "success") throw new Error("API failed");

  const map = data.rates;
  if (!map || typeof map !== "object") throw new Error("Bad rates");

  // USD가 누락될 가능성 대비
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

    // 사용자가 금액을 이미 입력했으면 자동 변환(원치 않으면 삭제해도 됨)
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

  // base=USD 기준
  // amount(from) -> USD: amount / fromRate
  // USD -> to: (amount / fromRate) * toRate
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
