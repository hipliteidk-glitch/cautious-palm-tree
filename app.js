/* OTP Verification V3 — reconstructed from the reference recording */
(() => {
  const CODE = "4719";
  const N = CODE.length;

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
        if (getCode().length === N) verify(getCode());
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

  /* ---------- set the active state ---------- */
  function show(state) {
    codeEl.classList.toggle("hidden", state !== "input");
    orbitEl.classList.toggle("hidden", state !== "orbit");
    successEl.classList.toggle("hidden", state !== "success");
    helperEl.classList.toggle("hidden", state !== "input");
    resendEl.classList.toggle("hidden", state !== "orbit");
    messageEl.classList.toggle("hidden", state === "success");
  }

  /* ---------- verify / orbit animation ---------- */
  function verify(code) {
    state = "orbit";
    hideMessage();
    show("orbit");
    log("Verifying…");
    hintEl.style.visibility = "hidden";
    startResend(25);

    const digits = code.split("");
    orbitSlots.innerHTML = "";
    const slotsEl = digits.map((d) => {
      const el = document.createElement("span");
      el.className = "orbit__slot";
      el.textContent = d;
      orbitSlots.appendChild(el);
      return el;
    });

    const centre = 125;
    const radius = 78;
    const angle = 90;
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad) * radius;
    const dy = Math.sin(rad) * radius;

    // digits converge to orbit, then spin together
    const WIND_UP_BRAKE = [0.12, 0.52, 0.82, 1];
    slotsEl.forEach((el, i) => {
      const a0 = ((angle + i * 90) * Math.PI) / 180;
      const x0 = Math.cos(a0) * radius;
      const y0 = Math.sin(a0) * radius;
      el.style.transformOrigin = `${centre}px ${centre}px`;
      el.animate(
        [
          { transform: `translate(0,0) scale(1)` },
          {
            transform: `translate(${x0}px,${y0}px) scale(1)`,
            offset: 0.55,
          },
        ],
        { duration: 880, easing: "cubic-bezier(.2,.7,.3,1)" }
      );
    });

    setTimeout(() => {
      // spin the whole set, as in the reference
      const arm = (el, base) =>
        el.animate(
          [
            { transform: `translate(${dx}px,${dy}px) rotate(0deg)` },
            { transform: `translate(${dx}px,${dy}px) rotate(45deg)` },
            { transform: `translate(${dx}px,${dy}px) rotate(90deg)` },
            { transform: `translate(${dx}px,${dy}px) rotate(135deg)` },
            { transform: `translate(${dx}px,${dy}px) rotate(180deg)` },
            { transform: `translate(${dx}px,${dy}px) rotate(225deg)` },
            { transform: `translate(${dx}px,${dy}px) rotate(270deg)` },
            { transform: `translate(${dx}px,${dy}px) rotate(315deg)` },
            { transform: `translate(${dx}px,${dy}px) rotate(360deg)` },
          ],
          { duration: 880, iterations: 1, easing: "cubic-bezier(.1,.6,.2,1)" }
        );
      // offset each so they take the four positions
      slotsEl.forEach((el, i) => (el.dataset.base = i));
      spinCycle(slotsEl, dx, dy, 0);
      setTimeout(() => succeed(), 2400);
    }, 900);
  }

  function spinCycle(list, dx, dy, round) {
    list.forEach((el, i) => {
      // four arms kept 90° apart
      const start = (i * 90 + round * 90) % 360;
      el.animate(
        [
          { transform: `translate(${dx}px,${dy}px) rotate(${start}deg)` },
          { transform: `translate(${dx}px,${dy}px) rotate(${start + 90}deg)` },
        ],
        { duration: 880, easing: "cubic-bezier(.2,.7,.3,1)" }
      );
    });
    setTimeout(() => spinCycle(list, dx, dy, round + 1), 880);
  }

  function succeed() {
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
    verify(CODE);
  });

  /* ---------- restart ---------- */
  function restart() {
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
