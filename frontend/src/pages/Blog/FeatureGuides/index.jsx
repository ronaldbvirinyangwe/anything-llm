import React from "react";
import FeatureGuideArticle from "./FeatureGuideArticle";
import { featureGuideArticles } from "./articleData";

export function ChikoroAIFeaturesGuide() {
  return <FeatureGuideArticle article={featureGuideArticles.pillar} />;
}

export function ChikoroAIAugust2026Update() {
  return <FeatureGuideArticle article={featureGuideArticles.update} />;
}

export function ChikoroAIForStudents() {
  return <FeatureGuideArticle article={featureGuideArticles.students} />;
}

export function ChikoroAIForTeachers() {
  return <FeatureGuideArticle article={featureGuideArticles.teachers} />;
}

export function ChikoroAIForParents() {
  return <FeatureGuideArticle article={featureGuideArticles.parents} />;
}

export function ChikoroAIForSchools() {
  return <FeatureGuideArticle article={featureGuideArticles.schools} />;
}
