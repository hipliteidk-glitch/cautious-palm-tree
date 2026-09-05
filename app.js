/* OTP Verification V3 — matched to the reference recording */
(() => {
  const CODE = "4719";
  const N = CODE.length;
  const ORBIT_RADIUS = 78;   // px from hub to tile centre
  const ORBIT_MS = 1760;     // one full revolution (2 x 880ms beats)
  const SPLASH_MS = 1800;    // how long the TikTok Lite splash holds

  const card = document.getElementById("card");
  const statusEl = document.getElementById("cardStatus");
  const hintEl = document.getElementById("cardHint");
  const codeEl = document.getElementById("code");
  const orbitEl = document.getElementById("orbit");
  const orbitSlots = document.getElementById("orbitSlots");
  const successEl = document.getElementById("success");
  const messageEl = document.getElementById("message");
  const fillBtn = document.getElementById("fillBtn");
  const helperEl = document.getElementById("helper");
  const resendEl = document.getElementById("resend");
  const resendCountEl = document.getElementById("resendCount");
  const continueBtn = document.getElementById("continueBtn");
  const splashEl = document.getElementById("splash");

  const slots = [];
  let state = "input"; // input | orbit | success | splash
  let resendTimer = null;
  let successTimer = null;
  let splashTimer = null;
  let orbitAnims = [];

  const log = (m) => { statusEl.textContent = m; };

  /* ---------- build input slots ---------- */
  function buildSlots() {
    codeEl.innerHTML = "";
    slots.length = 0;
    for (let i = 0; i < N; i++) {
      const slot = document.createElement("label");
      slot.className = "slot";
      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "numeric";
      input.autocomplete = "one-time-code";
      input.maxLength = 1;
      input.dataset.index = i;

      input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 1);
        slot.classList.toggle("filled", !!input.value);
        slot.classList.remove("error");
        if (input.value && i < N - 1) slots[i + 1].querySelector("input").focus();
        if (getCode().length === N) handleCode(getCode());
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && i > 0) {
          slots[i - 1].querySelector("input").focus();
          slots[i - 1].querySelector("input").value = "";
          slots[i - 1].classList.remove("filled");
          e.preventDefault();
        }
      });
      input.addEventListener("focus", () => {
        slots.forEach((s, idx) => s.classList.toggle("active", idx === i));
      });

      slot.appendChild(input);
      codeEl.appendChild(slot);
      slots.push(slot);
    }
    slots[0].querySelector("input").focus();
  }

  const getCode = () => slots.map((s) => s.querySelector("input").value).join("");
  const setSlotValue = (val) => {
    slots.forEach((s, i) => {
      const input = s.querySelector("input");
      input.value = val[i] || "";
      s.classList.toggle("filled", !!val[i]);
    });
  };
  const resetSlots = () => setSlotValue("");

  /* ---------- set the active view ---------- */
  function show(view) {
    codeEl.classList.toggle("hidden", view !== "input");
    orbitEl.classList.toggle("hidden", view !== "orbit");
    successEl.classList.toggle("hidden", view !== "success");
    helperEl.classList.toggle("hidden", view !== "input");
    resendEl.classList.toggle("hidden", view !== "orbit");
    messageEl.classList.toggle("hidden", view !== "input");
  }

  /* ---------- clear any running animation state ---------- */
  function stopAnimations() {
    if (successTimer) clearTimeout(successTimer);
    if (splashTimer) clearTimeout(splashTimer);
    successTimer = null;
    splashTimer = null;
    orbitAnims.forEach((a) => a.cancel());
    orbitAnims = [];
  }

  /* ---------- input handling ---------- */
  function handleCode(code) {
    if (code === CODE) {
      verify();
    } else {
      state = "input";
      log("Verify your number");
      hintEl.style.visibility = "";
      slots.forEach((s) => s.classList.add("error"));
      setTimeout(() => {
        slots.forEach((s) => s.classList.remove("error"));
        resetSlots();
        slots[0].querySelector("input").focus();
      }, 900);
    }
  }

  /* ---------- orbit / verifying ---------- */
  function verify() {
    state = "orbit";
    show("orbit");
    // reference keeps "Verify your number" up during the spin
    log("Verify your number");
    hintEl.style.visibility = "hidden";
    startResend(25);

    // tiles rest at top/right/bottom/left, clockwise — 7,9,1,4
    // (clockwise order from top; base angle = rotate() deg at tile centre/hub)
    const placements = [
      { d: "7", base: 270 },
      { d: "9", base: 0 },
      { d: "1", base: 90 },
      { d: "4", base: 180 },
    ];

    orbitSlots.innerHTML = "";
    const items = placements.map(({ d, base }) => {
      const el = document.createElement("span");
      el.className = "orbit__slot";
      const face = document.createElement("span");
      face.className = "orbit__face";
      face.textContent = d;
      el.appendChild(face);
      el.dataset.base = base;
      orbitSlots.appendChild(el);
      return el;
    });

    // the recording's technique: origin on the hub, then
    // `rotate(base) translate(r,0)`; the face counter-rotates so each
    // digit stays readable while the tiles orbit and tilt.
    items.forEach((el) => {
      const base = Number(el.dataset.base);
      const face = el.querySelector(".orbit__face");

      const orbit = el.animate(
        [
          { transform: `rotate(${base}deg) translate(${ORBIT_RADIUS}px, 0px)` },
          { transform: `rotate(${base + 360}deg) translate(${ORBIT_RADIUS}px, 0px)` },
        ],
        { duration: ORBIT_MS, easing: "cubic-bezier(.2,.75,.3,1)", fill: "forwards" }
      );
      const stand = face.animate(
        [
          { transform: `rotate(${-base}deg)` },
          { transform: `rotate(${-base - 360}deg)` },
        ],
        { duration: ORBIT_MS, easing: "cubic-bezier(.2,.75,.3,1)", fill: "forwards" }
      );
      orbitAnims.push(orbit, stand);
    });

    successTimer = setTimeout(() => succeed(), ORBIT_MS + 200);
  }

  /* ---------- success + splash ---------- */
  function succeed() {
    stopAnimations();
    state = "success";
    show("success");
    log("Verified successfully");
    hintEl.style.visibility = "";
    stopResend();

    // reference: after the success screen rests, the app shows the splash
    splashTimer = setTimeout(showSplash, 2400);
  }

  function showSplash() {
    state = "splash";
    splashEl.classList.remove("hidden");
    splashTimer = setTimeout(restart, SPLASH_MS);
  }

  /* ---------- resend countdown ---------- */
  function startResend(sec) {
    stopResend();
    resendCountEl.textContent = sec;
    resendTimer = setInterval(() => {
      let v = parseInt(resendCountEl.textContent, 10) - 1;
      if (v <= 0) v = 25; // loop
      resendCountEl.textContent = v;
    }, 1000);
  }
  function stopResend() {
    if (resendTimer) clearInterval(resendTimer);
    resendTimer = null;
  }

  /* ---------- restart ---------- */
  function restart() {
    stopAnimations();
    state = "input";
    splashEl.classList.add("hidden");
    resetSlots();
    show("input");
    log("Verify your number");
    hintEl.style.visibility = "";
    stopResend();
    slots[0].querySelector("input").focus();
  }

  fillBtn.addEventListener("click", () => {
    setSlotValue(CODE);
    handleCode(CODE);
  });
  continueBtn.addEventListener("click", showSplash);

  buildSlots();
  show("input");
})();
