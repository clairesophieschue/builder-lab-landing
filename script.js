(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Each feature is isolated in its own try/catch so a failure in one
     (e.g. a missing element on some page) can never stop the others —
     including features declared later in this file — from running. */
  function safe(fn) {
    try {
      fn();
    } catch (err) {
      if (window.console && console.error) {
        console.error("[builder-lab]", err);
      }
    }
  }

  /* -----------------------------------------------------------------------
     Mobile navigation
     ----------------------------------------------------------------------- */
  safe(function () {
    var toggle = document.getElementById("nav-toggle");
    var mobileNav = document.getElementById("mobile-nav");
    if (!toggle || !mobileNav) return;

    var isOpen = function () {
      return document.documentElement.classList.contains("nav-open");
    };
    var openNav = function () {
      document.documentElement.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Fermer le menu");
    };
    var closeNav = function () {
      document.documentElement.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Ouvrir le menu");
    };

    toggle.addEventListener("click", function () {
      if (isOpen()) closeNav(); else openNav();
    });
    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen()) {
        closeNav();
        toggle.focus();
      }
    });
  });

  /* -----------------------------------------------------------------------
     Sticky header state
     ----------------------------------------------------------------------- */
  safe(function () {
    var header = document.getElementById("site-header");
    if (!header) return;

    var updateHeader = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  });

  /* -----------------------------------------------------------------------
     Scroll reveal — purely decorative. Content is always visible by
     default (see styles.css); this only ever adds a class that plays a
     short, opacity-free rise-in animation. If IntersectionObserver is
     unavailable or never fires, elements just stay in their normal,
     fully visible resting position — nothing to fall back to.
     ----------------------------------------------------------------------- */
  safe(function () {
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    var revealEls = document.querySelectorAll("[data-reveal]");
    if (!revealEls.length) return;

    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-play");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  });

  /* -----------------------------------------------------------------------
     Manifeste — per-word opacity reveal genuinely driven by scroll
     position (not a one-shot IntersectionObserver trigger). Words are
     wrapped in spans only when motion is allowed; otherwise the plain
     text from index.html is left untouched and fully visible.
     ----------------------------------------------------------------------- */
  safe(function () {
    var section = document.getElementById("manifeste");
    var textEl = document.getElementById("manifesto-text");
    if (!section || !textEl || reduceMotion) return;

    var words = textEl.textContent.trim().split(/\s+/);
    textEl.innerHTML = words
      .map(function (word) {
        return '<span class="manifesto-word">' + word + "</span>";
      })
      .join(" ");

    var wordEls = Array.prototype.slice.call(textEl.querySelectorAll(".manifesto-word"));
    if (!wordEls.length) return;

    var total = wordEls.length;
    var span = 1.6 / total; // each word's own transition window, slightly
    // overlapping its neighbours so the reveal reads as one continuous
    // wave rather than discrete steps.
    // Start positions are scaled so the LAST word's window still ends
    // exactly at progress = 1 — otherwise it would asymptotically
    // approach full opacity without ever quite reaching it.
    var maxStart = Math.max(0, 1 - span);

    var ticking = false;

    var updateReveal = function () {
      // Measured from the text block itself (not the section) so the
      // reveal is tied to when the words are actually well into the
      // viewport, not to when the (taller, centred) section first
      // appears at the bottom of the screen.
      var rect = textEl.getBoundingClientRect();
      var viewportH = window.innerHeight;
      // progress 0 → text block's top still at ~68% down the viewport
      // (plenty of black/glow visible first, nothing revealed yet);
      // progress 1 → text block's top has reached ~30% from the top
      // (upper half of the viewport, nearly fully lit).
      var start = viewportH * 0.68;
      var end = viewportH * 0.3;
      var progress = (start - rect.top) / (start - end);
      progress = Math.min(1, Math.max(0, progress));

      wordEls.forEach(function (el, i) {
        var wordStart = total > 1 ? (i / (total - 1)) * maxStart : 0;
        var local = (progress - wordStart) / span;
        local = Math.min(1, Math.max(0, local));
        el.style.opacity = 0.25 + local * 0.75;
        el.style.filter = "blur(" + (1 - local) + "px)";
      });

      ticking = false;
    };

    updateReveal();

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(updateReveal);
          ticking = true;
        }
      },
      { passive: true }
    );
  });

  /* -----------------------------------------------------------------------
     Projets — homepage : uniquement les 3 projets les plus récents, sans
     filtre ni pagination. Lit le tableau partagé exposé par
     projects-data.js (chargé avant ce fichier) — aucune donnée dupliquée
     entre la homepage et projets.html.
     ----------------------------------------------------------------------- */
  safe(function () {
    var grid = document.getElementById("projects-grid-home");
    if (!grid) return;

    var PROJECTS = window.BUILDER_LAB_PROJECTS || [];

    function escapeHtml(str) {
      var div = document.createElement("div");
      div.textContent = str == null ? "" : str;
      return div.innerHTML;
    }

    function findProject(name) {
      for (var i = 0; i < PROJECTS.length; i++) {
        if (PROJECTS[i].name === name) return PROJECTS[i];
      }
      return null;
    }

    // Sélection éditoriale (pas les 3 plus récents) : raconte le
    // positionnement Builder Lab en 3 cartes — Création → Design → Mise en
    // place. Les fiches complètes restent dans projects-data.js ; seuls le
    // label et une description courte sont propres à la homepage.
    var FEATURED = [
      {
        match: "Naterra",
        label: "Création",
        description: "Conception et développement en 3 mois d’une application mobile cartographique iOS et Android, de l’idée jusqu’à une première version fonctionnelle."
      },
      {
        match: "Stellantis",
        label: "Design",
        description: "Conception d’un dispositif international de montée en compétence en IA générative et prompt engineering pour 3 500 collaborateurs, déployé sur 4 fuseaux horaires — 96 % de satisfaction."
      },
      {
        match: "Le Wagon B2C",
        displayName: "Le Wagon",
        label: "Mise en place",
        description: "Refonte de la gestion de 120 professeurs sur 40 campus : centralisation des données et automatisation de 15 workflows."
      }
    ];

    function cardHtml(f) {
      var p = findProject(f.match);
      if (!p) return "";
      var tags = p.tags.map(function (tag) {
        return "<span>" + escapeHtml(tag) + "</span>";
      }).join("");
      var isLive = p.context === "en direct";
      return (
        '<article class="project-card">' +
        '<div class="project-card-top">' +
        '<span class="project-card-category">' + escapeHtml(f.label) + "</span>" +
        '<span class="project-card-date">' + escapeHtml(p.date) + "</span>" +
        "</div>" +
        '<h3 class="project-card-title">' + escapeHtml(f.displayName || p.name) + "</h3>" +
        '<p class="project-card-text">' + escapeHtml(f.description) + "</p>" +
        '<p class="project-card-context' + (isLive ? " project-card-context--live" : "") + '">' +
        escapeHtml(p.context) +
        "</p>" +
        '<div class="project-card-tags">' + tags + "</div>" +
        "</article>"
      );
    }

    grid.innerHTML = FEATURED.map(cardHtml).join("");
  });

  /* -----------------------------------------------------------------------
     Projets — page dédiée (projets.html) : portfolio complet, filtrable
     par 2 <select> natifs (Type + Outil, logique ET), tri chronologique
     décroissant, pas de pagination. Même tableau partagé que ci-dessus.
     ----------------------------------------------------------------------- */
  safe(function () {
    var grid = document.getElementById("projects-grid");
    if (!grid) return;

    var PROJECTS = window.BUILDER_LAB_PROJECTS || [];

    function sortKey(sortDate) {
      var parts = sortDate.split("-");
      var year = parseInt(parts[0], 10);
      var month = parts[1] ? parseInt(parts[1], 10) : 0;
      return year * 100 + month;
    }

    var sorted = PROJECTS.slice().sort(function (a, b) {
      return sortKey(b.sortDate) - sortKey(a.sortDate);
    });

    var typeSelect = document.getElementById("filter-type-select");
    var toolSelect = document.getElementById("filter-tool-select");
    var countEl = document.getElementById("projects-count");
    var emptyEl = document.getElementById("projects-empty");
    var resetBtn = document.getElementById("projects-reset");

    function escapeHtml(str) {
      var div = document.createElement("div");
      div.textContent = str == null ? "" : str;
      return div.innerHTML;
    }

    function cardHtml(p) {
      var tags = p.tags.map(function (tag) {
        return "<span>" + escapeHtml(tag) + "</span>";
      }).join("");
      var isLive = p.context === "en direct";
      return (
        '<article class="project-card">' +
        '<div class="project-card-top">' +
        '<span class="project-card-category">' + escapeHtml(p.type) + "</span>" +
        '<span class="project-card-date">' + escapeHtml(p.date) + "</span>" +
        "</div>" +
        '<h3 class="project-card-title">' + escapeHtml(p.name) + "</h3>" +
        '<p class="project-card-text">' + escapeHtml(p.description) + "</p>" +
        '<p class="project-card-context' + (isLive ? " project-card-context--live" : "") + '">' +
        escapeHtml(p.context) +
        "</p>" +
        '<div class="project-card-tags">' + tags + "</div>" +
        "</article>"
      );
    }

    function getFiltered() {
      var type = typeSelect ? typeSelect.value : "all";
      var tool = toolSelect ? toolSelect.value : "all";
      return sorted.filter(function (p) {
        var matchesType = type === "all" || p.type === type;
        var matchesTool = tool === "all" || p.tags.indexOf(tool) !== -1;
        return matchesType && matchesTool;
      });
    }

    function render() {
      var filtered = getFiltered();

      grid.innerHTML = filtered.map(cardHtml).join("");
      grid.hidden = filtered.length === 0;
      if (emptyEl) emptyEl.hidden = filtered.length !== 0;
      if (countEl) {
        countEl.textContent = filtered.length + (filtered.length > 1 ? " projets" : " projet");
      }
    }

    if (typeSelect) {
      typeSelect.addEventListener("change", render);
    }
    if (toolSelect) {
      toolSelect.addEventListener("change", render);
    }
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (typeSelect) typeSelect.value = "all";
        if (toolSelect) toolSelect.value = "all";
        render();
      });
    }

    render();
  });

  /* -----------------------------------------------------------------------
     Contact form
     ----------------------------------------------------------------------- */
  safe(function () {
    var form = document.getElementById("contact-form");
    if (!form) return;

    // Centralized Make webhook URL — update here if it ever changes.
    var MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/1gsmchh19t6n91ioru0f62j0i37i3km7";

    var submitBtn = document.getElementById("contact-submit");
    var formError = document.getElementById("contact-form-error");
    var successBlock = document.getElementById("contact-success");

    var REQUIRED_FIELDS = ["first_name", "last_name", "email", "need_type", "message"];
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var clearErrors = function () {
      form.querySelectorAll(".form-error").forEach(function (el) {
        el.textContent = "";
      });
      form.querySelectorAll(".form-field--invalid").forEach(function (el) {
        el.classList.remove("form-field--invalid");
      });
      form.querySelectorAll('[aria-invalid="true"]').forEach(function (el) {
        el.setAttribute("aria-invalid", "false");
      });
    };

    var setError = function (name, message) {
      var errorEl = form.querySelector('[data-error-for="' + name + '"]');
      var field = form.querySelector('[name="' + name + '"]');
      if (errorEl) errorEl.textContent = message;
      if (field) {
        var wrap = field.closest(".form-field");
        if (wrap) wrap.classList.add("form-field--invalid");
        field.setAttribute("aria-invalid", "true");
      }
    };

    var validate = function (data) {
      var valid = true;
      REQUIRED_FIELDS.forEach(function (name) {
        if (!data[name]) {
          setError(name, "Ce champ est obligatoire.");
          valid = false;
        }
      });
      if (data.email && !EMAIL_RE.test(data.email)) {
        setError("email", "Merci d'indiquer un email valide.");
        valid = false;
      }
      return valid;
    };

    var showSuccess = function () {
      form.hidden = true;
      if (successBlock) successBlock.hidden = false;
    };

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearErrors();
      if (formError) formError.hidden = true;

      var formData = new FormData(form);
      var data = {
        first_name: (formData.get("first_name") || "").toString().trim(),
        last_name: (formData.get("last_name") || "").toString().trim(),
        email: (formData.get("email") || "").toString().trim(),
        company: (formData.get("company") || "").toString().trim(),
        need_type: (formData.get("need_type") || "").toString().trim(),
        message: (formData.get("message") || "").toString().trim(),
        website: (formData.get("website") || "").toString().trim()
      };

      if (!validate(data)) return;

      // Honeypot: a real visitor never fills this hidden field. If it has a
      // value, silently drop the submission but still show the success
      // state, so the check never reveals itself to whatever filled it in.
      if (data.website) {
        showSuccess();
        return;
      }

      var payload = {
        type: "contact",
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        company: data.company,
        need_type: data.need_type,
        message: data.message,
        source: "builderlab.fr/contact",
        submitted_at: new Date().toISOString()
      };

      submitBtn.disabled = true;
      submitBtn.textContent = "Envoi en cours…";

      fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) throw new Error("Webhook responded with " + response.status);
          showSuccess();
        })
        .catch(function (err) {
          if (window.console && console.error) console.error("[builder-lab] contact form", err);
          if (formError) formError.hidden = false;
          submitBtn.disabled = false;
          submitBtn.textContent = "Envoyer ma demande";
        });
    });
  });
})();
