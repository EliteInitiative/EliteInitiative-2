// مبادرة النخبة — app.js
// منطق مشترك لكل الصفحات: القائمة على الهاتف، الرابط النشط، ومحرك بسيط لعرض الموارد.

(function () {
  "use strict";

  /* ---------- Mobile nav toggle ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Active nav link ---------- */
  const currentPage = (location.pathname.split("/").pop() || "index.html");
  document.querySelectorAll(".main-nav a[data-page]").forEach(function (link) {
    if (link.dataset.page === currentPage) {
      link.setAttribute("aria-current", "page");
    }
  });

  /* ---------- Homepage hero search -> redirects to the right resource page ---------- */
  const heroSearchForm = document.querySelector("[data-hero-search]");
  if (heroSearchForm) {
    heroSearchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const q = heroSearchForm.querySelector('input[type="search"]').value.trim();
      const type = heroSearchForm.querySelector("[data-filter-type]")?.value || "books";
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      window.location.href = type + ".html" + (params.toString() ? "?" + params.toString() : "");
    });
  }

  /* ==========================================================================
     Resource list controller
     يستخدم في: books.html, exams.html, solutions.html, summaries.html

     window.ELITE_DATA يجب أن يوضع في كل صفحة كمصفوفة من الملفات الحقيقية.
     شكل كل عنصر:
     {
       title: "اسم الملف",
       subject: "رياضيات",
       year: "2024",
       type: "كتاب" | "امتحان" | "حل" | "مذكرة",
       url: "https://...",
       relatedExamTitle: "اسم الامتحان المرتبط" (اختياري، خاص بصفحة الحلول)
     }

     إذا لم توضع بيانات حقيقية بعد (window.ELITE_DATA غير موجودة أو فارغة)،
     تظهر حالة "لا توجد بيانات بعد" بدل أي محتوى وهمي.
     ========================================================================== */

  const listEl = document.querySelector("[data-resource-list]");
  if (!listEl) return;

  const metaEl = document.querySelector("[data-results-meta]");
  const searchInput = document.querySelector("[data-filter-search]");
  const subjectSelect = document.querySelector("[data-filter-subject]");
  const yearSelect = document.querySelector("[data-filter-year]");
  const typeSelect = document.querySelector("[data-filter-type-select]");

  const rawData = Array.isArray(window.ELITE_DATA) ? window.ELITE_DATA : [];

  function paramsFromURL() {
    const p = new URLSearchParams(location.search);
    return { q: p.get("q") || "" };
  }

  function renderSkeleton() {
    listEl.innerHTML =
      '<div class="skeleton-grid">' +
      Array.from({ length: 6 }).map(function () { return '<div class="skeleton-card"></div>'; }).join("") +
      "</div>";
  }

  function renderEmpty(reason) {
    const messages = {
      "no-data": {
        title: "لا توجد ملفات هنا بعد",
        desc: "لم تتم إضافة أي محتوى حقيقي لهذا القسم حتى الآن.",
        action: null
      },
      "no-results": {
        title: "لم نجد نتائج مطابقة",
        desc: "جرّب كلمات بحث مختلفة أو امسح الفلاتر.",
        action: "مسح الفلاتر"
      }
    };
    const m = messages[reason] || messages["no-data"];
    listEl.innerHTML =
      '<div class="state-block">' +
      "<h3>" + m.title + "</h3><p>" + m.desc + "</p>" +
      (m.action ? '<button class="btn btn-outline" data-clear-filters>' + m.action + "</button>" : "") +
      "</div>";

    const clearBtn = listEl.querySelector("[data-clear-filters]");
    if (clearBtn) clearBtn.addEventListener("click", clearFilters);
  }

  function renderError() {
    listEl.innerHTML =
      '<div class="state-block">' +
      "<h3>تعذّر تحميل المحتوى</h3><p>حدث خطأ أثناء تحميل الملفات. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.</p>" +
      '<button class="btn btn-outline" data-retry>إعادة المحاولة</button>' +
      "</div>";
    const retryBtn = listEl.querySelector("[data-retry]");
    if (retryBtn) retryBtn.addEventListener("click", loadAndRender);
  }

  function cardHTML(item) {
    const metaParts = [item.subject, item.year, item.type].filter(Boolean);
    const related = item.relatedExamTitle
      ? '<p class="resource-meta">مرتبط بـ: ' + item.relatedExamTitle + "</p>"
      : "";
    return (
      '<article class="resource-card">' +
      "<h3>" + item.title + "</h3>" +
      '<p class="resource-meta">' + metaParts.join(" · ") + "</p>" +
      related +
      '<a class="btn btn-outline btn-sm" href="' + item.url + '" target="_blank" rel="noopener">فتح الملف ↗</a>' +
      "</article>"
    );
  }

  function applyFilters(data) {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const subject = subjectSelect?.value || "";
    const year = yearSelect?.value || "";
    const type = typeSelect?.value || "";

    return data.filter(function (item) {
      const matchesQ = !q ||
        (item.title || "").toLowerCase().includes(q) ||
        (item.subject || "").toLowerCase().includes(q);
      const matchesSubject = !subject || item.subject === subject;
      const matchesYear = !year || String(item.year) === year;
      const matchesType = !type || item.type === type;
      return matchesQ && matchesSubject && matchesYear && matchesType;
    });
  }

  function clearFilters() {
    if (searchInput) searchInput.value = "";
    if (subjectSelect) subjectSelect.value = "";
    if (yearSelect) yearSelect.value = "";
    if (typeSelect) typeSelect.value = "";
    render();
  }

  function render() {
    if (!rawData.length) {
      renderEmpty("no-data");
      if (metaEl) metaEl.textContent = "";
      return;
    }
    const filtered = applyFilters(rawData);
    if (!filtered.length) {
      renderEmpty("no-results");
      if (metaEl) metaEl.textContent = "";
      return;
    }
    listEl.innerHTML = '<div class="resource-grid">' + filtered.map(cardHTML).join("") + "</div>";
    if (metaEl) metaEl.textContent = filtered.length + " نتيجة";
  }

  function loadAndRender() {
    renderSkeleton();
    // محاكاة وقت تحميل قصير فقط لعرض حالة التحميل عند وجود بيانات حقيقية لاحقًا.
    window.setTimeout(function () {
      try {
        render();
      } catch (err) {
        renderError();
      }
    }, 150);
  }

  [searchInput, subjectSelect, yearSelect, typeSelect].forEach(function (el) {
    if (el) el.addEventListener("input", render);
  });

  // تعبئة حقل البحث من رابط الصفحة الرئيسية إن وُجد
  const initial = paramsFromURL();
  if (initial.q && searchInput) searchInput.value = initial.q;

  loadAndRender();
})();
