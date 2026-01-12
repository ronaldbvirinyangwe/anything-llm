import { useState, useEffect, useRef } from "react";

export default function SubjectSelector({ subject, setSubject, curriculum, grade }) {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  const zimsec_secondary_subjects = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "English",
    "History",
    "Geography",
    "Shona",
    "ICT",
    "Accounting",
    "English Language",
    "Heritage Studies",
    "Additional Mathematics",
    "Statistics",
    "Combined Science",
    "Sociology",
    "Family and Religious Studies",
    "English Literature",
    "Business Studies",
    "Economics",
    "Economic History",
    "Computer Science",
    "Agriculture",
    "Technical Graphics",
    "Metal Technology",
    "Art",
    "Theatre Arts",
    "Dance",
    "Music",
    "Home Management",
    "Food and Nutrition",
    "Guidance and Counselling",
    "Textile Technology",
    "Sports and Physical Education",
    "Mechanical Mathematics",
    "Animal Science",
    "Crop Science",
    "Building Technology",
    "Horticulture",
    "Software Engineering",
    "Communication Skills",
    "Business Enterprise",
    "Sport Management",
    "Film Studies",
    "Literature in Indigenous Languages",
    "Indigenous Languages"
  ];

  const cambridge_secondary_subjects = [
    "Accounting",
    "Additional Mathematics",
    "Art and Design",
    "Biology",
    "Business Studies",
    "Cambridge International Mathematics",
    "Chemistry",
    "Combined Science",
    "Computer Studies",
    "Coordinated Sciences",
    "Development Studies",
    "Economics",
    "English (as a First and Second Language)",
    "Environmental Management",
    "French",
    "Geography",
    "German",
    "History",
    "Information and Communication Technology",
    "Literature (English, Spanish, etc.)",
    "Mathematics (with/without coursework)",
    "Physics",
    "Psychology",
    "Religious Studies",
    "Sociology",
    "Spanish",
    "Travel and Tourism",
    "Applied Information and Communication Technology (A Level)",
    "Computing (A Level)",
    "Design and Technology",
    "Drama",
    "Global Perspectives",
    "Thinking Skills"
  ];

  const zimsec_primary_subjects = [
    "Mathematics",
    "English Language",
    "Indigenous Language (e.g., Shona or Ndebele)",
    "Agriculture, Science and Technology, and ICT (combined)",
    "Social Sciences (includes Family, Religion and Moral Education, Heritage and Social Studies, Guidance and Counselling)",
    "Physical Education and Arts (includes Visual and Performing Arts, Physical Education, Sports and Mass Displays)"
  ];

  const cambridge_primary_subjects = [
    "English (as First Language or Second Language)",
    "Mathematics",
    "Science",
    "French",
  ];

  // 🎯 Filter subjects based on curriculum and grade
  const getFilteredSubjects = () => {
    const curriculumLower = (curriculum || "").toLowerCase();
    const gradeLower = (grade || "").toLowerCase();

    // Determine if primary or secondary based on grade
    const isPrimary = gradeLower.includes("primary") || 
                      ["grade 1", "grade 2", "grade 3", "grade 4", "grade 5", "grade 6", "grade 7"].includes(gradeLower);
    
    // Select the appropriate subject list
    if (curriculumLower.includes("zimsec")) {
      return isPrimary ? zimsec_primary_subjects : zimsec_secondary_subjects;
    } else if (curriculumLower.includes("cambridge")) {
      return isPrimary ? cambridge_primary_subjects : cambridge_secondary_subjects;
    }

    // Default: return all subjects if curriculum/grade not set
    return [...new Set([
      ...zimsec_primary_subjects,
      ...zimsec_secondary_subjects,
      ...cambridge_primary_subjects,
      ...cambridge_secondary_subjects
    ])].sort();
  };

  const subjects = getFilteredSubjects();

  // 🧠 Load saved subject once
  useEffect(() => {
    const saved = localStorage.getItem("selected_subject");
    if (saved && !subject) setSubject(saved);
  }, [subject, setSubject]);

  // 💾 Save to localStorage whenever it changes
  useEffect(() => {
    if (subject) localStorage.setItem("selected_subject", subject);
  }, [subject]);

  // 🧩 Hide header on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > lastScrollY.current && currentScroll > 60) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY.current = currentScroll;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed top-0 left-[270px] right-200 z-[50] transition-all duration-500 ease-in-out 
      ${hidden ? "-translate-y-[100%]" : "translate-y-0"}
      flex flex-col md:flex-row items-center justify-between gap-3
       border-b border-white/10 shadow-sm p-3`}
    >
      <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
        <div className="flex flex-col">
          <select
            value={subject || ""}
            onChange={(e) => setSubject(e.target.value)}
            className="bg-theme-bg-secondary text-white text-sm p-2 rounded-md focus:outline-none border border-white/10"
            disabled={!curriculum || !grade}
          >
            <option value="">
              {!curriculum || !grade 
                ? "-- Set curriculum & grade first --" 
                : "-- Choose Subject --"}
            </option>
            {subjects.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>
          {(!curriculum || !grade) && (
            <span className="text-xs text-yellow-400 mt-1">
              Complete your profile to see subjects
            </span>
          )}
        </div>
      </div>

      {subject && (
        <p className="text-xs text-theme-text-secondary italic text-right md:ml-auto">
          Current subject:{" "}
          <span className="text-white font-medium">{subject}</span>
        </p>
      )}
    </div>
  );
}