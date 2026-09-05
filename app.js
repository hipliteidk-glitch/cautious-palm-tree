/* OTP Verification V3 — reconstructed from the reference recording */
(() => {
  const CODE = "4719";
  const N = CODE.length;
  const ORBIT_RADIUS = 78;   // px around the hub
  const ORBIT_HOLD = 900;    // ms to converge onto the ring
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
  let orbitKickoff = null; // timer for the converge->spin transition
  let successTimer = null; // timer that moves to success
  let spinAnim = null;     // the live orbit rotation animation

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
    if (orbitKickoff) clearTimeout(orbitKickoff);
    if (successTimer) clearTimeout(successTimer);
    orbitKickoff = null;
    successTimer = null;
    if (spinAnim) { spinAnim.cancel(); spinAnim = null; }
    orbitSlots.style.transform = "";
    orbitSlots.getAnimations().forEach((a) => a.cancel());
    orbitEl.getAnimations().forEach((a) => a.cancel());
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
    const digits = CODE.split("");
    const items = digits.map((d) => {
      const el = document.createElement("span");
      el.className = "orbit__slot";
      el.textContent = d;
      orbitSlots.appendChild(el);
      return el;
    });

    // 1) digits converge from the centre to four fixed points on the ring.
    // Each slot keeps its own (x0, y0), so the four stay 90° apart.
    items.forEach((el, i) => {
      const a = ((90 + i * 90) * Math.PI) / 180; // top, right, bottom, left
      const x0 = Math.cos(a) * ORBIT_RADIUS;
      const y0 = Math.sin(a) * ORBIT_RADIUS;
      const converge = el.animate(
        [
          { transform: "translate(0px,0px)" },
          { transform: `translate(${x0}px,${y0}px)` },
        ],
        { duration: 880, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }
      );
      converge.onfinish = () => {
        // lock the resting transform so the parent can rotate cleanly
        el.style.transform = `translate(${x0}px,${y0}px)`;
      };
    });

    // 2) rotate the whole track (spacing preserved), then succeed
    orbitKickoff = setTimeout(() => {
      spinAnim = orbitSlots.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(90deg)" },
          { transform: "rotate(180deg)" },
          { transform: "rotate(270deg)" },
          { transform: "rotate(360deg)" },
        ],
        {
          duration: 880,
          iterations: 2,
          easing: "cubic-bezier(.1,.6,.2,1)",
          fill: "forwards",
        }
      );
      successTimer = setTimeout(() => succeed(), VERIFY_HOLD);
    }, ORBIT_HOLD);
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
