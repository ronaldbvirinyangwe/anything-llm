const ZIMSEC_PRIMARY = [
  ["math", "Mathematics", "📐"],
  ["eng", "English Language", "📖"],
  ["indigenous", "Indigenous Language", "💬"],
  ["science-tech", "Science and Technology", "🔬"],
  ["heritage-social", "Heritage-Social Studies", "🏛️"],
  ["agriculture", "Agriculture", "🌱"],
  ["ict", "Information Technology", "💻"],
  ["pe-arts", "Physical Education and Arts", "🎨"],
];

const ZIMSEC_SECONDARY = [
  ["math", "Mathematics", "📐"],
  ["eng", "English Language", "📖"],
  ["shona", "Shona", "💬"],
  ["ndebele", "Ndebele", "💬"],
  ["geo", "Geography", "🌍"],
  ["history", "History", "🏛️"],
  ["heritage", "Heritage Studies", "🇿🇼"],
  ["bio", "Biology", "🧬"],
  ["chem", "Chemistry", "⚗️"],
  ["physics", "Physics", "⚛️"],
  ["combined-science", "Combined Science", "🔬"],
  ["agriculture", "Agriculture", "🌱"],
  ["commerce", "Commerce", "🛒"],
  ["accounts", "Principles of Accounting", "🧾"],
  ["business", "Business Enterprise Skills", "💼"],
  ["computer-science", "Computer Science", "💻"],
  ["literature", "Literature in English", "📚"],
  ["frs", "Family and Religious Studies", "🤝"],
  ["food-tech", "Food Technology and Design", "🍲"],
  ["art-design", "Art and Design", "🎨"],
  ["pe", "Physical Education, Sport and Mass Displays", "🏃"],
];

const ZIMSEC_ADVANCED = [
  ["pure-math", "Pure Mathematics", "📐"],
  ["statistics", "Statistics", "📊"],
  ["eng-lit", "English Literature", "📚"],
  ["geo", "Geography", "🌍"],
  ["history", "History", "🏛️"],
  ["heritage", "Heritage Studies", "🇿🇼"],
  ["bio", "Biology", "🧬"],
  ["chem", "Chemistry", "⚗️"],
  ["physics", "Physics", "⚛️"],
  ["agriculture", "Agriculture", "🌱"],
  ["business", "Business Studies", "💼"],
  ["accounts", "Accounting", "🧾"],
  ["economics", "Economics", "📈"],
  ["computer-science", "Computer Science", "💻"],
  ["sociology", "Sociology", "👥"],
  ["frs", "Family and Religious Studies", "🤝"],
];

const CAMBRIDGE_PRIMARY = [
  ["math", "Mathematics", "📐"],
  ["eng", "English", "📖"],
  ["science", "Science", "🔬"],
  ["computing", "Computing", "💻"],
  ["global-perspectives", "Global Perspectives", "🌍"],
];

const CAMBRIDGE_SECONDARY = [
  ["math", "Mathematics", "📐"],
  ["eng", "English Language", "📖"],
  ["literature", "Literature in English", "📚"],
  ["geo", "Geography", "🌍"],
  ["history", "History", "🏛️"],
  ["bio", "Biology", "🧬"],
  ["chem", "Chemistry", "⚗️"],
  ["physics", "Physics", "⚛️"],
  ["combined-science", "Combined Science", "🔬"],
  ["agriculture", "Agriculture", "🌱"],
  ["business", "Business Studies", "💼"],
  ["accounts", "Accounting", "🧾"],
  ["economics", "Economics", "📈"],
  ["computer-science", "Computer Science", "💻"],
  ["ict", "Information and Communication Technology", "🖥️"],
  ["environment", "Environmental Management", "🌿"],
  ["global-perspectives", "Global Perspectives", "🌐"],
  ["art-design", "Art and Design", "🎨"],
  ["pe", "Physical Education", "🏃"],
];

const CAMBRIDGE_ADVANCED = [
  ["math", "Mathematics", "📐"],
  ["further-math", "Further Mathematics", "➗"],
  ["eng-lit", "Literature in English", "📚"],
  ["geo", "Geography", "🌍"],
  ["history", "History", "🏛️"],
  ["bio", "Biology", "🧬"],
  ["chem", "Chemistry", "⚗️"],
  ["physics", "Physics", "⚛️"],
  ["business", "Business", "💼"],
  ["accounts", "Accounting", "🧾"],
  ["economics", "Economics", "📈"],
  ["computer-science", "Computer Science", "💻"],
  ["sociology", "Sociology", "👥"],
  ["psychology", "Psychology", "🧠"],
  ["global-perspectives", "Global Perspectives and Research", "🌐"],
];

const makeSubjects = (rows) =>
  rows.map(([id, name, icon]) => ({ id, name, icon }));
const levels = (primary, secondary, advanced) => ({
  "Grade 1": primary,
  "Grade 2": primary,
  "Grade 3": primary,
  "Grade 4": primary,
  "Grade 5": primary,
  "Grade 6": primary,
  "Grade 7": primary,
  "Form 1": secondary,
  "Form 2": secondary,
  "Form 3": secondary,
  "Form 4": secondary,
  "Lower 6": advanced,
  "Upper 6": advanced,
});

const SUBJECT_CATALOG = {
  ZIMSEC: levels(
    makeSubjects(ZIMSEC_PRIMARY),
    makeSubjects(ZIMSEC_SECONDARY),
    makeSubjects(ZIMSEC_ADVANCED)
  ),
  Cambridge: levels(
    makeSubjects(CAMBRIDGE_PRIMARY),
    makeSubjects(CAMBRIDGE_SECONDARY),
    makeSubjects(CAMBRIDGE_ADVANCED)
  ),
};

function getSubjectsFor(curriculum, grade) {
  return SUBJECT_CATALOG[curriculum]?.[grade] || [];
}

module.exports = { SUBJECT_CATALOG, getSubjectsFor };
