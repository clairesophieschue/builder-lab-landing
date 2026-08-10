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
     Hero parallax (desktop, motion allowed only) — purely decorative
     transform on an image that already fills its container.
     ----------------------------------------------------------------------- */
  safe(function () {
    var heroMedia = document.getElementById("hero-media");
    if (!heroMedia || reduceMotion || window.innerWidth <= 720) return;

    var heroImg = heroMedia.querySelector("img");
    if (!heroImg) return;
    var ticking = false;

    var applyParallax = function () {
      var offset = Math.min(window.scrollY * 0.12, 90);
      heroImg.style.transform = "translateY(" + offset + "px)";
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(applyParallax);
          ticking = true;
        }
      },
      { passive: true }
    );
  });

  /* -----------------------------------------------------------------------
     Cas clients carousel — plain scroll-snap track driven by direct
     scrollLeft/scrollBy calls (not scrollIntoView, which can be flaky
     across browsers when the scrolling ancestor isn't the obvious one).
     All cards are static HTML and always rendered — nothing here gates
     their visibility, only which one is currently centred.
     ----------------------------------------------------------------------- */
  safe(function () {
    var track = document.getElementById("cases-track");
    var prevBtn = document.getElementById("cases-prev");
    var nextBtn = document.getElementById("cases-next");
    var dotsWrap = document.getElementById("cases-dots");
    if (!track || !prevBtn || !nextBtn || !dotsWrap) return;

    var cards = Array.prototype.slice.call(track.children);
    if (!cards.length) return;

    var dots = cards.map(function (_, index) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "cases-dot";
      dot.setAttribute("aria-label", "Aller au cas client " + (index + 1));
      dot.addEventListener("click", function () {
        goTo(index);
        stopAutoplay();
        startAutoplay();
      });
      dotsWrap.appendChild(dot);
      return dot;
    });

    var currentIndex = 0;

    var setActiveDot = function (index) {
      currentIndex = index;
      dots.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === index);
      });
    };

    var step = function () {
      return cards[0].getBoundingClientRect().width + 36; /* card + gap */
    };

    var goTo = function (index) {
      var clamped = ((index % cards.length) + cards.length) % cards.length;
      track.scrollTo({
        left: cards[clamped].offsetLeft,
        behavior: reduceMotion ? "auto" : "smooth"
      });
      setActiveDot(clamped);
    };

    prevBtn.addEventListener("click", function () {
      goTo(currentIndex - 1);
      stopAutoplay();
      startAutoplay();
    });
    nextBtn.addEventListener("click", function () {
      goTo(currentIndex + 1);
      stopAutoplay();
      startAutoplay();
    });

    /* Keep dots in sync with manual swipe/scroll too, throttled to one
       check per animation frame. */
    var scrollTicking = false;
    track.addEventListener(
      "scroll",
      function () {
        if (scrollTicking) return;
        scrollTicking = true;
        window.requestAnimationFrame(function () {
          var approx = Math.round(track.scrollLeft / step());
          var clamped = Math.max(0, Math.min(approx, cards.length - 1));
          if (clamped !== currentIndex) setActiveDot(clamped);
          scrollTicking = false;
        });
      },
      { passive: true }
    );

    setActiveDot(0);

    var autoplayId = null;

    var startAutoplay = function () {
      if (reduceMotion) return;
      autoplayId = window.setInterval(function () {
        goTo(currentIndex + 1);
      }, 5500);
    };

    var stopAutoplay = function () {
      if (autoplayId) {
        window.clearInterval(autoplayId);
        autoplayId = null;
      }
    };

    ["mouseenter", "focusin", "touchstart"].forEach(function (evt) {
      track.addEventListener(evt, stopAutoplay, { passive: true });
    });
    ["mouseleave", "focusout"].forEach(function (evt) {
      track.addEventListener(evt, startAutoplay, { passive: true });
    });

    startAutoplay();
  });

  /* -----------------------------------------------------------------------
     Formations & accompagnements — catalog data, filters, carousel.

     To add a new offer: append an object to PRODUCTS below with the same
     fields. `categories` must use slugs from CATEGORIES (add a new one
     there first if needed — it will automatically get its own filter
     pill). `priceNote` and `note` are optional (omit or leave "").
     To change a price: edit the `price`/`priceNote` string directly.
     To change categories/labels: edit the CATEGORIES array.
     ----------------------------------------------------------------------- */
  safe(function () {
    var track = document.getElementById("catalog-track");
    var filtersWrap = document.getElementById("catalog-filters");
    var prevBtn = document.getElementById("catalog-prev");
    var nextBtn = document.getElementById("catalog-next");
    if (!track || !filtersWrap || !prevBtn || !nextBtn) return;

    var CATEGORIES = [
      { slug: "tous", label: "Tous" },
      { slug: "introduction", label: "Introduction" },
      { slug: "outils", label: "Outils" },
      { slug: "automatisation", label: "Automatisation" },
      { slug: "formations-metier", label: "Formations métier" },
      { slug: "conseil", label: "Conseil" }
    ];

    var CATEGORY_LABELS = {};
    CATEGORIES.forEach(function (c) {
      CATEGORY_LABELS[c.slug] = c.label;
    });

    var PRODUCTS = [
      {
        title: "Trouver sa place à l'ère de l'IA",
        categories: ["introduction"],
        duration: "3h",
        audience: "Tous niveaux",
        description: "Comprendre ce que l'IA change réellement dans le travail, tester les outils et identifier les premiers usages utiles pour son métier.",
        price: "199 € HT / participant en session ouverte",
        priceNote: "ou à partir de 990 € HT / groupe en entreprise",
        cta: "Découvrir la formation",
        link: "contact.html"
      },
      {
        title: "L'IA pour les dirigeants de PME",
        categories: ["formations-metier"],
        duration: "3h",
        audience: "Direction",
        description: "Comprendre les opportunités et les limites de l'IA, identifier les cas d'usage prioritaires et décider par quoi commencer.",
        price: "À partir de 990 € HT / groupe",
        priceNote: "jusqu'à 12 participants",
        cta: "Découvrir la formation",
        link: "contact.html"
      },
      {
        title: "Prendre en main ChatGPT",
        categories: ["outils"],
        duration: "3h",
        audience: "Débutant",
        description: "Comprendre les fonctionnalités clés, mieux cadrer ses demandes, travailler avec ses fichiers et créer des usages directement applicables au quotidien.",
        price: "199 € HT / participant",
        priceNote: "ou à partir de 990 € HT / groupe",
        cta: "Découvrir la formation",
        link: "contact.html"
      },
      {
        title: "Prendre en main Claude & Claude Cowork",
        categories: ["outils"],
        duration: "3h",
        audience: "Débutant à intermédiaire",
        description: "Apprendre à travailler avec Claude sur des dossiers, analyser des documents, structurer une mission et produire des livrables plus efficacement.",
        price: "199 € HT / participant",
        priceNote: "ou à partir de 990 € HT / groupe",
        cta: "Découvrir la formation",
        link: "contact.html"
      },
      {
        title: "Prendre en main Microsoft Copilot",
        categories: ["outils"],
        duration: "3h",
        audience: "Microsoft 365",
        description: "Découvrir les usages de Copilot dans l'environnement Microsoft 365 et construire de premières routines adaptées à son métier.",
        price: "À partir de 1 090 € HT / groupe",
        note: "Licences compatibles nécessaires pour certains exercices.",
        cta: "Découvrir la formation",
        link: "contact.html"
      },
      {
        title: "Construire son premier assistant métier",
        categories: ["automatisation"],
        duration: "½ journée",
        audience: "Atelier pratique",
        description: "Partir d'une tâche réelle et construire un assistant adapté à son activité : contexte, règles, exemples, tests et garde-fous.",
        price: "249 € HT / participant",
        priceNote: "ou à partir de 1 200 € HT / groupe",
        cta: "Découvrir l'atelier",
        link: "contact.html"
      },
      {
        title: "Introduction à Claude Code",
        categories: ["outils"],
        duration: "½ journée",
        audience: "Débutant",
        description: "Découvrir comment travailler avec un agent de code pour explorer un projet, modifier un site et construire de premières fonctionnalités simples.",
        price: "249 € HT / participant",
        priceNote: "ou à partir de 1 200 € HT / groupe",
        cta: "Découvrir la formation",
        link: "contact.html"
      },
      {
        title: "Créer sa landing page avec Claude Code",
        categories: ["outils"],
        duration: "1 journée",
        audience: "Atelier pratique",
        description: "Passer d'une idée à une première landing page fonctionnelle : structure, contenu, design, génération du code, tests et mise en ligne.",
        price: "À partir de 390 € HT / participant",
        priceNote: "ou à partir de 1 800 € HT / groupe",
        note: "Accès Claude compatible avec Claude Code nécessaire.",
        cta: "Découvrir l'atelier",
        link: "contact.html"
      },
      {
        title: "Analyser ses données avec l'IA",
        categories: ["automatisation"],
        duration: "½ journée",
        audience: "Data",
        description: "Explorer ses données, poser les bonnes questions, identifier des tendances et transformer des fichiers bruts en analyses utiles à la décision.",
        price: "249 € HT / participant",
        priceNote: "ou à partir de 1 200 € HT / groupe",
        cta: "Découvrir la formation",
        link: "contact.html"
      },
      {
        title: "Automatiser ses premières tâches avec Make",
        categories: ["automatisation"],
        duration: "½ journée",
        audience: "Débutant",
        description: "Comprendre la logique d'un workflow, connecter plusieurs outils et construire une première automatisation à partir d'un besoin réel.",
        price: "249 € HT / participant",
        priceNote: "ou à partir de 1 200 € HT / groupe",
        cta: "Découvrir l'atelier",
        link: "contact.html"
      },
      {
        title: "Découvrir n8n et les workflows IA",
        categories: ["automatisation"],
        duration: "1 journée",
        audience: "Intermédiaire",
        description: "Construire des workflows plus avancés, connecter plusieurs services et intégrer des briques IA dans ses automatisations.",
        price: "390 € HT / participant",
        priceNote: "ou à partir de 1 800 € HT / groupe",
        cta: "Découvrir la formation",
        link: "contact.html"
      },
      {
        title: "Construire son premier workflow IA",
        categories: ["automatisation"],
        duration: "1 journée",
        audience: "Atelier pratique",
        description: "Choisir une tâche répétitive, concevoir le workflow, connecter les outils et repartir avec une première automatisation testée.",
        price: "390 € HT / participant",
        priceNote: "ou à partir de 1 800 € HT / groupe",
        cta: "Découvrir l'atelier",
        link: "contact.html"
      },
      {
        title: "L'IA pour les experts-comptables",
        categories: ["formations-metier"],
        duration: "½ journée",
        audience: "Cabinets",
        description: "Identifier et tester les usages adaptés au cabinet : analyse documentaire, préparation client, synthèse, reporting et automatisation, avec un focus sur la confidentialité.",
        price: "À partir de 1 200 € HT / groupe",
        priceNote: "jusqu'à 12 participants",
        cta: "Voir le programme",
        link: "contact.html"
      },
      {
        title: "L'IA pour les métiers du tourisme",
        categories: ["formations-metier"],
        duration: "½ journée",
        audience: "Tourisme",
        description: "Utiliser l'IA pour répondre aux clients, préparer des offres, produire des contenus, exploiter les informations locales et automatiser certaines tâches.",
        price: "À partir de 1 200 € HT / groupe",
        cta: "Voir le programme",
        link: "contact.html"
      },
      {
        title: "L'IA pour les cabinets d'avocats",
        categories: ["formations-metier"],
        duration: "½ journée",
        audience: "Juridique",
        description: "Explorer les usages de l'IA pour la recherche, l'analyse documentaire et la préparation de dossiers, tout en gardant la maîtrise des données sensibles.",
        price: "À partir de 1 200 € HT / groupe",
        cta: "Voir le programme",
        link: "contact.html"
      },
      {
        title: "L'IA pour les équipes commerciales",
        categories: ["formations-metier"],
        duration: "½ journée",
        audience: "Sales",
        description: "Utiliser l'IA pour préparer les rendez-vous, qualifier les besoins, structurer les propositions, produire les comptes rendus et faciliter le suivi commercial.",
        price: "À partir de 1 200 € HT / groupe",
        cta: "Voir le programme",
        link: "contact.html"
      },
      {
        title: "L'IA pour les fonctions RH",
        categories: ["formations-metier"],
        duration: "½ journée",
        audience: "RH",
        description: "Identifier les usages pertinents pour préparer des entretiens, structurer des contenus, analyser des documents et créer de premiers assistants internes.",
        price: "À partir de 1 200 € HT / groupe",
        cta: "Voir le programme",
        link: "contact.html"
      },
      {
        title: "Diagnostic IA express",
        categories: ["conseil"],
        duration: "Mission courte",
        audience: "PME / Direction",
        description: "Faire le point sur vos outils, vos données, vos processus et vos irritants pour identifier vos premiers cas d'usage prioritaires.",
        price: "À partir de 690 € HT",
        cta: "Parler de votre besoin",
        link: "contact.html"
      },
      {
        title: "Diagnostic IA & feuille de route",
        categories: ["conseil"],
        duration: "Conseil",
        audience: "IA & Data",
        description: "Analyser l'existant, identifier les opportunités, prioriser les cas d'usage et construire une feuille de route de déploiement.",
        price: "À partir de 1 500 € HT",
        cta: "Demander un diagnostic",
        link: "contact.html"
      },
      {
        title: "Coaching IA métier",
        categories: ["conseil"],
        duration: "",
        audience: "Individuel ou petite équipe",
        description: "Travailler sur une problématique précise : assistant commercial, analyse documentaire, reporting, automatisation ou prise en main d'un outil.",
        price: "À partir de 250 € HT / session",
        cta: "Parler de votre besoin",
        link: "contact.html"
      },
      {
        title: "Mise en place d'un premier outil IA",
        categories: ["conseil"],
        duration: "Construction",
        audience: "Adoption",
        description: "Cadrage, choix de la solution, construction, tests et prise en main d'un premier assistant, workflow ou outil adapté à l'activité.",
        price: "Sur devis",
        cta: "Parler de votre projet",
        link: "contact.html"
      }
    ];

    function escapeHtml(str) {
      var div = document.createElement("div");
      div.textContent = str == null ? "" : str;
      return div.innerHTML;
    }

    function categoryLabel(product) {
      return product.categories
        .map(function (slug) {
          return CATEGORY_LABELS[slug] || slug;
        })
        .join(" · ");
    }

    function metaLine(product) {
      if (product.duration && product.audience) return product.duration + " · " + product.audience;
      return product.duration || product.audience || "";
    }

    function cardHtml(p) {
      var extras = "";
      if (p.priceNote) extras += '<p class="catalog-card-price-note">' + escapeHtml(p.priceNote) + "</p>";
      if (p.note) extras += '<p class="catalog-card-note">' + escapeHtml(p.note) + "</p>";
      return (
        '<article class="catalog-card">' +
        '<p class="catalog-card-label">' + escapeHtml(categoryLabel(p)) + "</p>" +
        '<h3 class="catalog-card-title">' + escapeHtml(p.title) + "</h3>" +
        '<p class="catalog-card-meta">' + escapeHtml(metaLine(p)) + "</p>" +
        '<p class="catalog-card-text">' + escapeHtml(p.description) + "</p>" +
        // .catalog-card-price-block always renders (even with no priceNote/note)
        // so it reserves the same vertical space on every card — this is what
        // keeps the CTA button at an identical position regardless of content.
        '<div class="catalog-card-footer">' +
        '<div class="catalog-card-price-block">' +
        '<p class="catalog-card-price">' + escapeHtml(p.price) + "</p>" +
        extras +
        "</div>" +
        '<a href="' + p.link + '" class="catalog-card-cta">' + escapeHtml(p.cta) + "</a>" +
        "</div>" +
        "</article>"
      );
    }

    var updateArrows = function () {
      prevBtn.disabled = track.scrollLeft <= 4;
      nextBtn.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
    };

    function renderCards(list) {
      track.innerHTML = list.map(cardHtml).join("");
      track.scrollLeft = 0;
      updateArrows();
    }

    filtersWrap.innerHTML = CATEGORIES.map(function (c, i) {
      return (
        '<button type="button" class="catalog-filter' + (i === 0 ? " is-active" : "") + '" data-filter="' + c.slug + '">' +
        escapeHtml(c.label) +
        "</button>"
      );
    }).join("");

    var filterButtons = Array.prototype.slice.call(filtersWrap.querySelectorAll(".catalog-filter"));

    filterButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterButtons.forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
        });
        var slug = btn.dataset.filter;
        var list = slug === "tous" ? PRODUCTS : PRODUCTS.filter(function (p) {
          return p.categories.indexOf(slug) !== -1;
        });
        renderCards(list);
      });
    });

    var step = function () {
      var first = track.firstElementChild;
      return first ? first.getBoundingClientRect().width + 30 : 0;
    };

    prevBtn.addEventListener("click", function () {
      track.scrollBy({ left: -step(), behavior: reduceMotion ? "auto" : "smooth" });
    });
    nextBtn.addEventListener("click", function () {
      track.scrollBy({ left: step(), behavior: reduceMotion ? "auto" : "smooth" });
    });

    var scrollTicking = false;
    track.addEventListener(
      "scroll",
      function () {
        if (scrollTicking) return;
        scrollTicking = true;
        window.requestAnimationFrame(function () {
          updateArrows();
          scrollTicking = false;
        });
      },
      { passive: true }
    );

    renderCards(PRODUCTS);
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
    };

    var setError = function (name, message) {
      var errorEl = form.querySelector('[data-error-for="' + name + '"]');
      var field = form.querySelector('[name="' + name + '"]');
      if (errorEl) errorEl.textContent = message;
      if (field) {
        var wrap = field.closest(".form-field");
        if (wrap) wrap.classList.add("form-field--invalid");
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
