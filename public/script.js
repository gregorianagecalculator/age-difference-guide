(function () {
  "use strict";

  var DAY_MS = 86400000;
  var numberFormatter = new Intl.NumberFormat("en-US");

  var UNIT_FORMS = {
    years: { one: "سنة واحدة", two: "سنتان", twoGen: "سنتين", few: "سنوات", many: "سنة" },
    months: { one: "شهر واحد", two: "شهران", twoGen: "شهرين", few: "أشهر", many: "شهراً" },
    days: { one: "يوم واحد", two: "يومان", twoGen: "يومين", few: "أيام", many: "يوماً" }
  };

  function daysInMonth(year, monthIndex) {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  }

  function parseDateInput(value) {
    if (!value) {
      return null;
    }

    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }

    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    var date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  }

  function addYearsClamped(date, yearsToAdd) {
    var year = date.getUTCFullYear() + yearsToAdd;
    var month = date.getUTCMonth();
    var day = Math.min(date.getUTCDate(), daysInMonth(year, month));
    return new Date(Date.UTC(year, month, day));
  }

  function addMonthsClamped(date, monthsToAdd) {
    var totalMonths = date.getUTCFullYear() * 12 + date.getUTCMonth() + monthsToAdd;
    var year = Math.floor(totalMonths / 12);
    var month = totalMonths % 12;
    var day = Math.min(date.getUTCDate(), daysInMonth(year, month));
    return new Date(Date.UTC(year, month, day));
  }

  function diffExact(older, younger) {
    var years = 0;
    var months = 0;
    var cursor = new Date(older.getTime());

    while (true) {
      var nextYear = addYearsClamped(cursor, 1);
      if (nextYear.getTime() <= younger.getTime()) {
        years += 1;
        cursor = nextYear;
      } else {
        break;
      }
    }

    while (true) {
      var nextMonth = addMonthsClamped(cursor, 1);
      if (nextMonth.getTime() <= younger.getTime()) {
        months += 1;
        cursor = nextMonth;
      } else {
        break;
      }
    }

    var days = Math.round((younger.getTime() - cursor.getTime()) / DAY_MS);

    return { years: years, months: months, days: days };
  }

  function formatArabicUnit(value, forms, genitive) {
    if (value === 1) {
      return forms.one;
    }
    if (value === 2) {
      return genitive ? forms.twoGen : forms.two;
    }
    if (value >= 3 && value <= 10) {
      return value + " " + forms.few;
    }
    return value + " " + forms.many;
  }

  function buildParts(years, months, days, genitive) {
    var parts = [];

    if (years > 0) {
      parts.push(formatArabicUnit(years, UNIT_FORMS.years, genitive));
    }
    if (months > 0) {
      parts.push(formatArabicUnit(months, UNIT_FORMS.months, genitive));
    }
    if (days > 0) {
      parts.push(formatArabicUnit(days, UNIT_FORMS.days, genitive));
    }

    if (parts.length === 0) {
      parts.push("أقل من يوم واحد");
    }

    return parts;
  }

  var form = document.getElementById("age-difference-form");
  var inputA = document.getElementById("person-a");
  var inputB = document.getElementById("person-b");
  var swapButton = document.getElementById("swap-dates");
  var resetButton = document.getElementById("reset-calculator");
  var formMessage = document.getElementById("form-message");
  var resultPanel = document.getElementById("result-panel");
  var resultSummary = document.getElementById("result-summary");
  var resultYears = document.getElementById("result-years");
  var resultMonths = document.getElementById("result-months");
  var resultDays = document.getElementById("result-days");
  var resultTotalDays = document.getElementById("result-total-days");
  var resultTotalMonths = document.getElementById("result-total-months");
  var resultTotalWeeks = document.getElementById("result-total-weeks");
  var resultNote = document.getElementById("result-note");

  function clearMessage() {
    if (formMessage) {
      formMessage.textContent = "";
      formMessage.classList.remove("is-success");
    }
  }

  function hideResult() {
    if (resultPanel) {
      resultPanel.hidden = true;
    }
  }

  function setResultNumbers(years, months, days, totalDays, totalMonths, totalWeeks) {
    if (resultYears) {
      resultYears.textContent = numberFormatter.format(years);
    }
    if (resultMonths) {
      resultMonths.textContent = numberFormatter.format(months);
    }
    if (resultDays) {
      resultDays.textContent = numberFormatter.format(days);
    }
    if (resultTotalDays) {
      resultTotalDays.textContent = numberFormatter.format(totalDays);
    }
    if (resultTotalMonths) {
      resultTotalMonths.textContent = numberFormatter.format(totalMonths);
    }
    if (resultTotalWeeks) {
      resultTotalWeeks.textContent = numberFormatter.format(totalWeeks);
    }
  }

  function updateResult() {
    if (!inputA || !inputB || !resultPanel || !resultSummary) {
      return;
    }

    var dateA = parseDateInput(inputA.value);
    var dateB = parseDateInput(inputB.value);

    if (!dateA || !dateB) {
      hideResult();
      if (formMessage) {
        formMessage.textContent = "يرجى إدخال تاريخ الميلاد للشخصين.";
        formMessage.classList.remove("is-success");
      }
      return;
    }

    var timeA = dateA.getTime();
    var timeB = dateB.getTime();

    if (timeA === timeB) {
      setResultNumbers(0, 0, 0, 0, 0, 0);
      resultSummary.textContent = "العمران متساويان: تاريخ الميلاد واحد.";
      if (resultNote) {
        resultNote.textContent = "لا يوجد فرق بين التاريخين. إذا كان لديك تاريخ مختلف، عدّل أحد الحقلين ثم أعد الحساب.";
      }
      resultPanel.hidden = false;
      clearMessage();
      return;
    }

    var olderIsA = timeA < timeB;
    var older = olderIsA ? dateA : dateB;
    var younger = olderIsA ? dateB : dateA;
    var olderLabel = olderIsA ? "الشخص الأول" : "الشخص الثاني";
    var youngerLabel = olderIsA ? "الشخص الثاني" : "الشخص الأول";

    var difference = diffExact(older, younger);
    var totalDays = Math.round((younger.getTime() - older.getTime()) / DAY_MS);
    var totalMonths = difference.years * 12 + difference.months;
    var totalWeeks = Math.floor(totalDays / 7);
    var parts = buildParts(difference.years, difference.months, difference.days, true);

    resultSummary.textContent = olderLabel + " أكبر من " + youngerLabel + " بفارق " + parts.join(" و") + ".";
    setResultNumbers(difference.years, difference.months, difference.days, totalDays, totalMonths, totalWeeks);

    var notes = ["تم الحساب باستخدام التاريخ الميلادي فقط، دون احتساب الوقت أو المنطقة الزمنية."];

    if (older.getUTCMonth() === 1 && older.getUTCDate() === 29) {
      notes.push("تاريخ الشخص الأكبر في 29 فبراير. يعتمد الحساب على عدد الأيام الفعلي، وقد تختلف بعض الجهات بيوم واحد.");
    }
    if (younger.getUTCMonth() === 1 && younger.getUTCDate() === 29) {
      notes.push("تاريخ الشخص الأصغر في 29 فبراير. يعتمد الحساب على عدد الأيام الفعلي، وقد تختلف بعض الجهات بيوم واحد.");
    }

    if (resultNote) {
      resultNote.textContent = notes.join(" ");
    }

    resultPanel.hidden = false;
    clearMessage();

    if (window.matchMedia("(max-width: 820px)").matches) {
      window.requestAnimationFrame(function () {
        resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      updateResult();
    });
  }

  [inputA, inputB].forEach(function (input) {
    if (!input) {
      return;
    }

    input.addEventListener("input", function () {
      clearMessage();
      hideResult();
    });
  });

  if (swapButton) {
    swapButton.addEventListener("click", function () {
      if (!inputA || !inputB) {
        return;
      }

      var temp = inputA.value;
      inputA.value = inputB.value;
      inputB.value = temp;

      if (resultPanel && !resultPanel.hidden) {
        updateResult();
      } else {
        clearMessage();
      }
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", function () {
      if (form) {
        form.reset();
      }
      hideResult();
      clearMessage();
      if (inputA) {
        inputA.focus();
      }
    });
  }

  var checklistInputs = Array.prototype.slice.call(
    document.querySelectorAll(".checklist input[type=\"checkbox\"]")
  );
  var checklistProgress = document.getElementById("checklist-progress");
  var checklistBar = document.getElementById("checklist-bar");

  function updateChecklist() {
    if (!checklistInputs.length) {
      return;
    }

    var checked = checklistInputs.filter(function (input) {
      return input.checked;
    }).length;

    if (checklistProgress) {
      checklistProgress.textContent = checked + " من " + checklistInputs.length;
    }
    if (checklistBar) {
      checklistBar.style.width = (checked / checklistInputs.length) * 100 + "%";
    }
  }

  checklistInputs.forEach(function (input) {
    input.addEventListener("change", updateChecklist);
  });
  updateChecklist();

  var faqDetails = Array.prototype.slice.call(
    document.querySelectorAll(".faq-list details")
  );

  faqDetails.forEach(function (detail) {
    detail.addEventListener("toggle", function () {
      if (!detail.open) {
        return;
      }

      faqDetails.forEach(function (other) {
        if (other !== detail) {
          other.open = false;
        }
      });
    });
  });

  var sections = Array.prototype.slice.call(
    document.querySelectorAll("main section[id]")
  );
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".chapter-nav a")
  );
  var scrollTicking = false;

  function updateActiveNav() {
    if (!sections.length || !navLinks.length) {
      return;
    }

    var offset = 130;
    var currentId = sections[0].id;

    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= offset) {
        currentId = section.id;
      }
    });

    navLinks.forEach(function (link) {
      link.classList.toggle("is-active", link.getAttribute("href") === "#" + currentId);
    });

    scrollTicking = false;
  }

  function onScroll() {
    if (!scrollTicking) {
      window.requestAnimationFrame(updateActiveNav);
      scrollTicking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateActiveNav();
})();
