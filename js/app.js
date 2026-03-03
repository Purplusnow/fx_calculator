const rateEl = document.getElementById("rate");
const usdEl = document.getElementById("usd");
const krwEl = document.getElementById("krw");
const resultEl = document.getElementById("result");
const rateMetaEl = document.getElementById("rateMeta");

const toKrwBtn = document.getElementById("toKrw");
const toUsdBtn = document.getElementById("toUsd");
const loadRateBtn = document.getElementById("loadRate");

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : NaN;
}

function fmtKrw(v) {
  return Math.round(v).toLocaleString("ko-KR");
}

function fmtUsd(v) {
  return (Math.round(v * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getRate() {
  const r = n(rateEl.value);
  if (!Number.isFinite(r) || r <= 0) return NaN;
  return r;
}

function usdToKrw() {
  const rate = getRate();
  const usd = n(usdEl.value);

  if (!Number.isFinite(rate) || !Number.isFinite(usd)) {
    resultEl.textContent = "환율과 USD 값을 올바르게 입력해 주세요.";
    return;
  }

  const krw = usd * rate;
  krwEl.value = String(Math.round(krw));
  resultEl.textContent = `${fmtUsd(usd)} USD = ${fmtKrw(krw)} KRW`;
}

function krwToUsd() {
  const rate = getRate();
  const krw = n(krwEl.value);

  if (!Number.isFinite(rate) || !Number.isFinite(krw)) {
    resultEl.textContent = "환율과 KRW 값을 올바르게 입력해 주세요.";
    return;
  }

  const usd = krw / rate;
  usdEl.value = String(Math.round(usd * 100) / 100);
  resultEl.textContent = `${fmtKrw(krw)} KRW = ${fmtUsd(usd)} USD`;
}

async function loadLiveRateUSDKRW() {
  try {
    loadRateBtn.disabled = true;
    loadRateBtn.textContent = "불러오는 중...";

    const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();    

    if (data.result !== "success") throw new Error("API failed");

    const krw = Number(data.rates?.KRW);
    if (!Number.isFinite(krw) || krw <= 0) throw new Error("Bad KRW rate");

    const rounded = Math.round(krw * 1000) / 1000;
    rateEl.value = String(rounded);

    if (rateMetaEl) {
      rateMetaEl.textContent = data.time_last_update_utc
        ? `업데이트(UTC): ${data.time_last_update_utc}`
        : "업데이트 시간: 확인 불가";
    }

    resultEl.textContent = "환율을 불러왔어요.";
  } catch (e) {
    resultEl.textContent = "환율을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
    if (rateMetaEl) rateMetaEl.textContent = "";
  } finally {
    loadRateBtn.disabled = false;
    loadRateBtn.textContent = "환율 불러오기";
  }
}

toKrwBtn.addEventListener("click", usdToKrw);
toUsdBtn.addEventListener("click", krwToUsd);
loadRateBtn.addEventListener("click", loadLiveRateUSDKRW);

usdEl.addEventListener("keydown", (e) => { if (e.key === "Enter") usdToKrw(); });
krwEl.addEventListener("keydown", (e) => { if (e.key === "Enter") krwToUsd(); });
rateEl.addEventListener("keydown", (e) => { if (e.key === "Enter") usdToKrw(); });

// 페이지 로딩 시 자동으로 한 번 불러오기
loadLiveRateUSDKRW();
