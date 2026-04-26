const SKILL_KEYWORDS = [
  "agile",
  "azure",
  "confluence",
  "docker",
  "grafana",
  "itil",
  "itom",
  "itsm",
  "jira",
  "kanban",
  "linux",
  "microsoft 365",
  "nagios",
  "pl/i",
  "power bi",
  "prometheus",
  "python",
  "remedy",
  "scrum",
  "servicenow",
  "sql",
  "visio",
  "windows server",
  "z/os"
];

const LANGUAGE_KEYWORDS = [
  "english",
  "italian",
  "french",
  "german",
  "spanish"
];

export function normalizeText(rawText) {
  return rawText
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ﬀ/g, "ff")
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .trim();
}

export function parseCvText(rawText) {
  const text = normalizeText(rawText);
  const topSlice = text.slice(0, 2400);
  const email = matchFirst(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phone = extractPhone(text);
  const birthDate = matchFirst(text, /\b\d{2}\/\d{2}\/\d{4}\b/);
  const nationality = extractNationality(text);
  const linkedin = matchFirst(text, /https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i);
  const portfolio = matchFirst(text, /https?:\/\/(?!(?:www\.)?linkedin\.com\/)[^\s)]+/i);
  const fullName = extractFullName(topSlice, email, birthDate);
  const [firstName, ...rest] = fullName ? fullName.split(" ") : [""];
  const lastName = rest.join(" ").trim();
  const address = extractAddress(topSlice, email, phone);
  const { city, country, postalCode } = parseAddress(address);
  const jobTitle = extractJobTitle(topSlice);
  const currentCompany = extractCurrentCompany(text);
  const skills = extractKeywords(text, SKILL_KEYWORDS);
  const languages = extractLanguages(text, nationality);
  const summary = buildSummary({ jobTitle, currentCompany, skills, languages });

  return stripEmpty({
    fullName,
    firstName,
    lastName,
    email,
    phone,
    birthDate,
    nationality,
    address,
    city,
    country,
    postalCode,
    location: [city, country].filter(Boolean).join(", "),
    jobTitle,
    currentCompany,
    linkedin,
    portfolio,
    skills,
    languages,
    summary,
    rawText
  });
}

function matchFirst(text, pattern) {
  const match = text.match(pattern);
  return match ? collapseWhitespace(match[0]) : "";
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanPhone(value) {
  if (!value) {
    return "";
  }

  const compact = value.replace(/[^\d+]/g, "");
  return compact.length >= 8 ? compact : "";
}

function extractPhone(text) {
  const explicitIntl = matchFirst(text, /\+\d{1,3}[\s()]*(?:\d[\s-]*){6,}/);
  if (explicitIntl) {
    return cleanPhone(explicitIntl);
  }

  const explicitParen = matchFirst(text, /\(\+\d{1,3}\)\s*(?:\d[\s-]*){6,}/);
  if (explicitParen) {
    return cleanPhone(explicitParen);
  }

  const fallback = matchFirst(text, /(?:\d[\s-]*){8,}/);
  return cleanPhone(fallback);
}

function extractFullName(topSlice, email, birthDate) {
  const aroundBirth = topSlice.match(
    /(?:work experience\s+)?([A-Z][A-Za-z' -]+(?:\s+[A-Z][A-Za-z' -]+){1,3})\s+Date of birth/i
  );

  if (aroundBirth?.[1]) {
    return collapseWhitespace(aroundBirth[1]);
  }

  const beforeEmail = email ? topSlice.split(email)[0] : topSlice;
  const candidates = beforeEmail
    .split(/\n+/)
    .map((line) => collapseWhitespace(line))
    .filter(Boolean)
    .filter((line) => !/\d/.test(line))
    .filter((line) => line.split(" ").length >= 2 && line.split(" ").length <= 4)
    .filter((line) => !/work experience|contact|education|training/i.test(line));

  if (candidates.length > 0) {
    return candidates[0];
  }

  if (birthDate) {
    const beforeBirth = topSlice.split(birthDate)[0];
    const fallback = beforeBirth.match(/([A-Z][A-Za-z' -]+(?:\s+[A-Z][A-Za-z' -]+){1,3})\s*$/);
    if (fallback?.[1]) {
      return collapseWhitespace(fallback[1]);
    }
  }

  return "";
}

function extractNationality(text) {
  const match = text.match(/Nationality:\s*([A-Za-z ]+?)(?=\s{2,}|CONTACT|$)/i);
  return match ? collapseWhitespace(match[1]) : "";
}

function extractAddress(topSlice, email, phone) {
  const contactBlock = topSlice.match(
    /CONTACT\s+(.+?)\s+[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );
  const relevant = (contactBlock?.[1] || topSlice)
    .replace(phone || "", "")
    .replace(/\(Home\)|||/g, " ");
  const inlineAddress = collapseWhitespace(relevant);
  const addressMatch = inlineAddress.match(
    /((?:via|viale|piazza|corso|street|road|avenue|boulevard)\s+.+?,\s*[A-Za-z][A-Za-z ]+)/i
  );

  if (addressMatch?.[1]) {
    return collapseWhitespace(addressMatch[1]);
  }

  const postalMatch = inlineAddress.match(/([A-Z][A-Za-z' -]+ \d{1,5} \d{4,6} [A-Za-z' -]+,? [A-Za-z' -]+)/);
  return postalMatch ? collapseWhitespace(postalMatch[1]) : "";
}

function parseAddress(address) {
  if (!address) {
    return { city: "", country: "", postalCode: "" };
  }

  const postalCode = matchFirst(address, /\b\d{4,6}\b/);
  const cityMatch = address.match(/\b\d{4,6}\s+([A-Za-z' -]+)(?:,|\s)([A-Za-z' -]+)$/);
  if (cityMatch) {
    return {
      city: collapseWhitespace(cityMatch[1]),
      country: collapseWhitespace(cityMatch[2]),
      postalCode
    };
  }

  const trailingCity = address.match(/,\s*([A-Za-z' -]+)$/);
  return {
    city: trailingCity ? collapseWhitespace(trailingCity[1]) : "",
    country: /italy/i.test(address) ? "Italy" : "",
    postalCode
  };
}

function extractJobTitle(topSlice) {
  const match = topSlice.match(
    /CONTACT[\s\S]*?\b([A-Z][A-Za-z/&,\- ]{5,80})\s+\d{2}\/\d{4}\s*[–-]\s*(?:Current|\d{2}\/\d{4})/i
  );
  if (match?.[1]) {
    return collapseWhitespace(match[1]);
  }

  const fallback = topSlice.match(
    /\b([A-Z][A-Za-z/&,\- ]{5,80})\s+\d{2}\/\d{4}\s*[–-]\s*(?:Current|\d{2}\/\d{4})/i
  );
  return fallback ? collapseWhitespace(fallback[1]) : "";
}

function extractCurrentCompany(text) {
  const companyMatches = [...text.matchAll(/\b([A-Z][A-Z&.\s]{2,})\s+(?:Rome|Milan|Italy|Remote)\b/g)];
  if (companyMatches.length > 0) {
    return collapseWhitespace(companyMatches[0][1]);
  }
  return "";
}

function extractKeywords(text, keywords) {
  const lower = text.toLowerCase();
  return keywords
    .filter((keyword) => lower.includes(keyword.toLowerCase()))
    .map((keyword) => formatKeyword(keyword));
}

function formatKeyword(keyword) {
  const overrides = {
    "pl/i": "PL/I",
    "power bi": "Power BI",
    "z/os": "z/OS",
    jira: "Jira",
    agile: "Agile",
    scrum: "Scrum",
    kanban: "Kanban",
    sql: "SQL",
    docker: "Docker",
    azure: "Azure",
    grafana: "Grafana",
    prometheus: "Prometheus"
  };
  return overrides[keyword] || keyword.replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractLanguages(text, nationality) {
  const found = extractKeywords(text, LANGUAGE_KEYWORDS);
  if (!found.length && /italian/i.test(nationality)) {
    return ["Italian", "English"];
  }
  return found;
}

function buildSummary({ jobTitle, currentCompany, skills, languages }) {
  const fragments = [];

  if (jobTitle) {
    fragments.push(`${jobTitle} con esperienza in ambienti IT enterprise`);
  }

  if (currentCompany) {
    fragments.push(`attualmente attivo in ${currentCompany}`);
  }

  if (skills.length) {
    fragments.push(`competenze su ${skills.slice(0, 6).join(", ")}`);
  }

  if (languages.length) {
    fragments.push(`lingue: ${languages.join(", ")}`);
  }

  return fragments.join(". ") + (fragments.length ? "." : "");
}

function stripEmpty(profile) {
  return Object.fromEntries(
    Object.entries(profile).filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== "";
    })
  );
}
