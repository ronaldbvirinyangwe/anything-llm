import { useEffect, useState } from "react";
import { CURRICULUM_KEY } from "@/utils/constants";
import useUser from "@/hooks/useUser";
import System from "@/models/system";

const CURRICULUM_UPDATED_EVENT = "chikoroai:curriculum-updated";

function cacheCurriculum(value) {
  localStorage.setItem(CURRICULUM_KEY, value);
  window.dispatchEvent(
    new CustomEvent(CURRICULUM_UPDATED_EVENT, { detail: value })
  );
}

export default function useCurriculum() {
  const { user } = useUser();
  const [curriculum, setCurriculumState] = useState(
    () => localStorage.getItem(CURRICULUM_KEY) || ""
  );
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const syncCurriculum = (event) => setCurriculumState(event.detail || "");
    window.addEventListener(CURRICULUM_UPDATED_EVENT, syncCurriculum);
    return () =>
      window.removeEventListener(CURRICULUM_UPDATED_EVENT, syncCurriculum);
  }, []);

  useEffect(() => {
    if (user?.role !== "student") return;
    let active = true;
    System.getMyProfile().then(({ success, profile }) => {
      if (!active || !success || !profile?.curriculum) return;
      cacheCurriculum(profile.curriculum);
    });
    return () => {
      active = false;
    };
  }, [user?.id, user?.role]);

  const setCurriculum = async (value) => {
    const previousValue = curriculum;
    cacheCurriculum(value);
    if (user?.role !== "student") return { success: true };

    setUpdating(true);
    const result = await System.updateCurriculum(value);
    setUpdating(false);
    if (!result.success) cacheCurriculum(previousValue);
    return result;
  };

  return { curriculum, setCurriculum, updating };
}
