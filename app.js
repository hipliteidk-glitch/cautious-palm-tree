/* OTP Verification V3 — reconstructed from the reference recording */
(() => {
  const CODE = "4719";
  const N = CODE.length;
  const ORBIT_RADIUS = 78;   // px around the hub
  const VERIFY_HOLD = 2400;  // ms of spin before success

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

  const slots = [];
  let state = "input"; // input | orbit | success
  let resendTimer = null;
  let successTimer = null;      // timer that moves to success
  let orbitAnims = [];          // every running orbit animation

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
    messageEl.classList.toggle("hidden", view === "success");
  }

  /* ---------- clear any running animation state ---------- */
  function stopAnimations() {
    if (successTimer) clearTimeout(successTimer);
    successTimer = null;
    orbitAnims.forEach((a) => a.cancel());
    orbitAnims = [];
    orbitSlots.style.transform = "";
    orbitSlots.querySelectorAll("*").forEach((el) => { el.style.transform = ""; });
  }

  /* ---------- input handling ---------- */
  function handleCode(code) {
    if (code === CODE) {
      verify();
    } else {
      // wrong code: shake/red the slots briefly, then clear
      state = "input";
      log("Incorrect code — try again");
      hintEl.style.visibility = "";
      slots.forEach((s) => s.classList.add("error"));
      setTimeout(() => {
        slots.forEach((s) => s.classList.remove("error"));
        log("Verify your number");
        resetSlots();
        slots[0].querySelector("input").focus();
      }, 900);
    }
  }

  /* ---------- verify / orbit animation ---------- */
  function verify() {
    state = "orbit";
    show("orbit");
    log("Verifying…");
    hintEl.style.visibility = "hidden";
    hideMessage();
    startResend(25);

    orbitSlots.innerHTML = "";
    const items = CODE.split("").map((d) => {
      const el = document.createElement("span");
      el.className = "orbit__slot";
      const face = document.createElement("span");
      face.className = "orbit__face";
      face.textContent = d;
      el.appendChild(face);
      orbitSlots.appendChild(el);
      return el;
    });

    // Exact technique from the reference: origin on the hub, then
    // `rotate(base) translate(r,0)` — each tile orbits the hub while its
    // face counter-rotates so the digits stay upright and readable.
    const r = ORBIT_RADIUS;
    const ORBIT_MS = 1760; // one full revolution over 2 keyframe beats
    items.forEach((el, i) => {
      const base = i * 90; // right, bottom, left, top
      el.style.transformOrigin = "center";
      const face = el.querySelector(".orbit__face");

      const orbit = el.animate(
        [
          { transform: `rotate(${base}deg) translate(${r}px, 0px)` },
          { transform: `rotate(${base + 360}deg) translate(${r}px, 0px)` },
        ],
        { duration: ORBIT_MS, easing: "cubic-bezier(.17,.8,.3,1)", fill: "forwards" }
      );
      const stand = face.animate(
        [
          { transform: `rotate(${-base}deg)` },
          { transform: `rotate(${-base - 360}deg)` },
        ],
        { duration: ORBIT_MS, easing: "cubic-bezier(.17,.8,.3,1)", fill: "forwards" }
      );
      orbitAnims.push(orbit, stand);
    });

    successTimer = setTimeout(() => succeed(), VERIFY_HOLD);
  }

  function succeed() {
    stopAnimations();
    state = "success";
    show("success");
    log("Verified successfully");
    hintEl.style.visibility = "";
    stopResend();
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

  /* ---------- message bubble ---------- */
  function showMessage() {
    messageEl.classList.remove("hidden");
  }
  function hideMessage() {
    messageEl.classList.add("hidden");
  }
  fillBtn.addEventListener("click", () => {
    setSlotValue(CODE);
    handleCode(CODE);
  });

  /* ---------- restart ---------- */
  function restart() {
    stopAnimations();
    state = "input";
    resetSlots();
    showMessage();
    show("input");
    log("Verify your number");
    hintEl.style.visibility = "";
    stopResend();
    slots[0].querySelector("input").focus();
  }
  successEl.addEventListener("click", restart);

  buildSlots();
  showMessage();
  show("input");
})();
