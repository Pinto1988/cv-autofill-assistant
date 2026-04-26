(function () {
  const HIGHLIGHT_ATTR = "data-cv-autofill-highlight";

  const FIELD_ALIASES = {
    fullName: ["full name", "nome e cognome", "legal name", "applicant name", "name"],
    firstName: ["first name", "given name", "nome"],
    lastName: ["last name", "surname", "family name", "cognome"],
    email: ["email", "e-mail", "mail"],
    phone: ["phone", "mobile", "telephone", "cell", "telefono"],
    address: ["address", "street", "indirizzo", "address line"],
    city: ["city", "town", "locality", "citta"],
    postalCode: ["zip", "postal code", "postcode", "cap"],
    country: ["country", "nation", "paese"],
    location: ["location", "based in", "residence"],
    jobTitle: [
      "job title",
      "current title",
      "professional title",
      "headline",
      "current role",
      "position"
    ],
    currentCompany: ["current company", "employer", "company", "azienda"],
    linkedin: ["linkedin"],
    portfolio: ["portfolio", "website", "personal site", "url"],
    birthDate: ["date of birth", "birth date", "dob", "data di nascita"],
    nationality: ["nationality", "citizenship", "cittadinanza"],
    summary: [
      "summary",
      "professional summary",
      "profile",
      "bio",
      "about you",
      "tell us about yourself",
      "introduce yourself"
    ],
    skills: ["skills", "technical skills", "competencies", "stack", "technologies"],
    languages: ["languages", "spoken languages", "idiomas", "lingue"]
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "FILL_FORM") {
      return undefined;
    }

    const result = fillForm(message.profile || {});
    sendResponse(result);
    return true;
  });

  function fillForm(profile) {
    injectHighlightStyle();
    clearHighlights();

    const fields = Array.from(
      document.querySelectorAll("input, textarea, select")
    ).filter((element) => isFillable(element));

    let filled = 0;
    let skipped = 0;

    for (const field of fields) {
      const guessedKey = inferFieldKey(field);
      if (!guessedKey) {
        skipped += 1;
        continue;
      }

      const value = getProfileValue(profile, guessedKey, field);
      if (!value) {
        skipped += 1;
        continue;
      }

      const changed = applyValue(field, value, guessedKey);
      if (changed) {
        filled += 1;
        highlight(field);
      } else {
        skipped += 1;
      }
    }

    return { filled, skipped };
  }

  function isFillable(element) {
    if (element.disabled || element.readOnly) {
      return false;
    }

    if (element.tagName === "TEXTAREA") {
      return true;
    }

    if (element.tagName === "SELECT") {
      return isTextLikeSelect(element);
    }

    const type = (element.type || "").toLowerCase();
    if (
      [
        "hidden",
        "submit",
        "button",
        "reset",
        "file",
        "password",
        "checkbox",
        "radio",
        "date",
        "datetime-local",
        "month",
        "week",
        "time",
        "number",
        "range",
        "color"
      ].includes(type)
    ) {
      return false;
    }

    return true;
  }

  function isTextLikeSelect(element) {
    const descriptor = getDescriptor(element);
    if (!descriptor) {
      return false;
    }

    const allowedKeys = new Set([
      "country",
      "city",
      "nationality",
      "jobTitle",
      "currentCompany"
    ]);
    const guessedKey = inferFieldKey(element);
    if (!allowedKeys.has(guessedKey)) {
      return false;
    }

    const blockedWords = [
      "authorized",
      "eligible",
      "sponsor",
      "visa",
      "gender",
      "ethnicity",
      "race",
      "veteran",
      "disability",
      "consent",
      "privacy",
      "terms",
      "relocate",
      "remote",
      "start date",
      "salary",
      "notice period"
    ];

    return !blockedWords.some((word) => descriptor.includes(word));
  }

  function inferFieldKey(element) {
    const type = (element.type || "").toLowerCase();

    if (type === "email") {
      return "email";
    }

    if (type === "tel") {
      return "phone";
    }

    if (type === "url") {
      const descriptor = getDescriptor(element);
      return descriptor.includes("linkedin") ? "linkedin" : "portfolio";
    }

    const descriptor = getDescriptor(element);
    if (!descriptor) {
      return "";
    }

    if (isGenericNameField(descriptor)) {
      return "fullName";
    }

    for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some((alias) => descriptor.includes(alias))) {
        return key;
      }
    }

    return "";
  }

  function getDescriptor(element) {
    const parts = [
      element.name,
      element.id,
      element.placeholder,
      element.getAttribute("aria-label"),
      element.getAttribute("autocomplete"),
      getAssociatedLabelText(element),
      getFieldsetLegend(element)
    ]
      .filter(Boolean)
      .join(" ");

    return normalize(parts);
  }

  function isGenericNameField(descriptor) {
    if (!descriptor.includes("name")) {
      return false;
    }

    const blocked = [
      "username",
      "company name",
      "business name",
      "preferred name",
      "nick name",
      "nickname",
      "maiden name",
      "first name",
      "last name",
      "family name",
      "surname"
    ];

    return !blocked.some((word) => descriptor.includes(word));
  }

  function getAssociatedLabelText(element) {
    const labels = [];

    if (element.labels?.length) {
      labels.push(...Array.from(element.labels).map((label) => label.innerText || label.textContent || ""));
    }

    if (element.id) {
      const explicit = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (explicit) {
        labels.push(explicit.innerText || explicit.textContent || "");
      }
    }

    const wrapperLabel = element.closest("label");
    if (wrapperLabel) {
      labels.push(wrapperLabel.innerText || wrapperLabel.textContent || "");
    }

    return labels.join(" ");
  }

  function getFieldsetLegend(element) {
    const fieldset = element.closest("fieldset");
    const legend = fieldset?.querySelector("legend");
    return legend ? legend.innerText || legend.textContent || "" : "";
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function getProfileValue(profile, key, element) {
    const rawValue = profile[key];
    let value = "";

    if (Array.isArray(rawValue)) {
      value = rawValue.join(", ");
    } else {
      value = rawValue || "";
    }

    if (!value && key === "location") {
      value = profile.location || [profile.city, profile.country].filter(Boolean).join(", ");
    }

    if (!value && key === "summary") {
      value = profile.summary || "";
    }

    if (!value && key === "fullName") {
      value = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    }

    if (key === "birthDate" && value && element.type === "date") {
      const parts = value.split("/");
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    return value;
  }

  function applyValue(element, value, key) {
    if (!value) {
      return false;
    }

    if (element.tagName === "SELECT") {
      return applySelectValue(element, value);
    }

    const type = (element.type || "").toLowerCase();
    if (type === "checkbox" || type === "radio") {
      return false;
    }

    const currentValue = String(element.value || "").trim();
    if (currentValue === String(value).trim()) {
      return false;
    }

    element.focus();
    element.value = value;
    dispatchInputEvents(element);

    if (key === "summary" && element.maxLength > 0 && value.length > element.maxLength) {
      element.value = value.slice(0, element.maxLength);
      dispatchInputEvents(element);
    }

    return true;
  }

  function applySelectValue(element, value) {
    const wanted = normalize(value);
    const options = Array.from(element.options);

    const exact = options.find((option) => normalize(option.textContent) === wanted || normalize(option.value) === wanted);
    const partial = options.find(
      (option) =>
        normalize(option.textContent).includes(wanted) ||
        wanted.includes(normalize(option.textContent)) ||
        normalize(option.value).includes(wanted)
    );

    const match = exact || partial;
    if (!match) {
      return false;
    }

    if (element.value === match.value) {
      return false;
    }

    element.value = match.value;
    dispatchInputEvents(element);
    return true;
  }

  function dispatchInputEvents(element) {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.blur();
  }

  function injectHighlightStyle() {
    if (document.getElementById("cv-autofill-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "cv-autofill-style";
    style.textContent = `
      [${HIGHLIGHT_ATTR}="true"] {
        outline: 2px solid #a43d2d !important;
        outline-offset: 1px !important;
        background: rgba(164, 61, 45, 0.08) !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function highlight(element) {
    element.setAttribute(HIGHLIGHT_ATTR, "true");
  }

  function clearHighlights() {
    document.querySelectorAll(`[${HIGHLIGHT_ATTR}="true"]`).forEach((element) => {
      element.removeAttribute(HIGHLIGHT_ATTR);
    });
  }
})();
