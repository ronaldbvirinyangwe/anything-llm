import { useState } from "react";
import { CURRICULUM_KEY } from "@/utils/constants";

export default function useCurriculum() {
  const [curriculum, setCurriculumState] = useState(
    () => localStorage.getItem(CURRICULUM_KEY) || ""
  );

  const setCurriculum = (value) => {
    localStorage.setItem(CURRICULUM_KEY, value);
    setCurriculumState(value);
  };

  return { curriculum, setCurriculum };
}
