import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import { useTheme } from "../../hooks/useTheme";
import "./PaperSelector.css";

export default function PaperSelector() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [pdfBlob, setPdfBlob] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Filters
  const [examBoardFilter, setExamBoardFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");

  // Sidebar state sync
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => JSON.parse(localStorage.getItem("sidebarCollapsed")) || false
  );

    const samplePapers = [
    {
      id: 1,
      title: "O level Accounts Paper 1",
      subject: "Accounts",
      level: "Form 4",
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp1,
      examBoard: "Zimsec",
    },
    {
      id: 2,
      title: "O level Accounts Paper 2",
      subject: "Accounts",
      level: "Form 4",
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp2,
      examBoard: "Zimsec",
    },
    {
      id: 3,
      title: "A level Accounts Paper 1",
      subject: "Accounts",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp1a,
      examBoard: "Zimsec",
    },
    {
      id: 4,
      title: "A level Accounts Paper 2",
      subject: "Accounts",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp2a,
      examBoard: "Zimsec",
    },
    {
      id: 5,
      title: "A level Accounts Paper 3",
      subject: "Accounts",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountsp3a,
      examBoard: "Zimsec",
    },
    {
      id: 6,
      title: "O level Agriculture Paper 1",
      subject: "Agriculture",
      level: "Form 4",
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp1,
      examBoard: "Zimsec",
    },
    {
      id: 7,
      title: "O level Agriculture Paper 2",
      subject: "Agriculture",
      level: "Form 4",
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp2,
      examBoard: "Zimsec",
    },
    {
      id: 8,
      title: "A level Agriculture Paper 1",
      subject: "Agriculture",
      level: "Form 6",
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp1a,
      examBoard: "Zimsec",
    },
    {
      id: 9,
      title: "A level Agriculture Paper 2",
      subject: "Mathematics",
      level: "Form 6",
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp2a,
      examBoard: "Zimsec",
    },
    {
      id: 10,
      title: "A level Agriculture Paper 3",
      subject: "Agriculture",
      level: "Form 6",
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp3a,
      examBoard: "Zimsec",
    },
    {
      id: 11,
      title: "A level Agriculture Paper 3",
      subject: "Agriculture",
      level: "Form 6",
      thumbnail: assets.agriculture,
      pdfFile: assets.agricp32a,
      examBoard: "Zimsec",
    },
    {
      id: 12,
      title: "O level Art Paper 1",
      subject: "Art",
      level: "Form 4",
      thumbnail: assets.art,
      pdfFile: assets.artp1,
      examBoard: "Zimsec",
    },
    {
      id: 14,
      title: "O level Art Paper 3",
      subject: "Art",
      level: "Form 4",
      thumbnail: assets.art,
      pdfFile: assets.artp3,
      examBoard: "Zimsec",
    },
    {
      id: 15,
      title: "A level Art Paper 1",
      subject: "Art",
      level: "Form 6",
      thumbnail: assets.art,
      pdfFile: assets.artp1a,
      examBoard: "Zimsec",
    },
    {
      id: 16,
      title: "A level Art Paper 2",
      subject: "Art",
      level: "Form 6",
      thumbnail: assets.art,
      pdfFile: assets.artp2a,
      examBoard: "Zimsec",
    },
    {
      id: 17,
      title: "O level Biology Paper 1",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biologyp1,
      examBoard: "Zimsec",
    },
    {
      id: 18,
      title: "O level Biology Paper 2",
      subject: "Biology",
      level: "Form 4",
      thumbnail: assets.biology,
      pdfFile: assets.biop2,
      examBoard: "Zimsec",
    },
    {
      id: 19,
      title: "O level Biology Paper 3",
      subject: "Art",
      level: "Form 4",
      thumbnail: assets.biology,
      pdfFile: assets.biop3,
      examBoard: "Zimsec",
    },
    {
      id: 20,
      title: "O level Business Enterprise Paper 1",
      subject: "Business Enterprise",
      level: "Form 4",
      thumbnail: assets.business,
      pdfFile: assets.businessenterprisep1,
      examBoard: "Zimsec",
    },
    {
      id: 21,
      title: "O Business Enterprise Paper 2",
      subject: "Business Enterprise",
      level: "Form 4",
      thumbnail: assets.business,
      pdfFile: assets.businessenterprisep2,
      examBoard: "Zimsec",
    },
    {
      id: 22,
      title: "A level Business Enterprise Paper 1",
      subject: "Business Enterprise",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessenterprisep1a,
      examBoard: "Zimsec",
    },
    {
      id: 23,
      title: "A Level Business Enterprise Paper 2",
      subject: "Business Enterprise",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessenterprisep2a,
      examBoard: "Zimsec",
    },
    {
      id: 24,
      title: "A level Business Studies Paper 1",
      subject: "Business Studies",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessstudiesp1a,
      examBoard: "Zimsec",
    },
    {
      id: 25,
      title: "A level Art Paper 2",
      subject: "Business Studies",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessstudiesp2a,
      examBoard: "Zimsec",
    },
    {
      id: 26,
      title: "O level Chemistry Paper 1",
      subject: "Chemistry",
      level: "Form 4",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp1,
      examBoard: "Zimsec",
    },
    {
      id: 27,
      title: "O level Chemistry Paper 2",
      subject: "Chemistry",
      level: "Form 4",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp2,
      examBoard: "Zimsec",
    },
    {
      id: 28,
      title: "O level Chemistry Paper 3",
      subject: "Chemistry",
      level: "Form 4",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp3,
      examBoard: "Zimsec",
    },
    {
      id: 29,
      title: "A level Art Paper 1",
      subject: "Chemistry",
      level: "Form 6",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp1a,
      examBoard: "Zimsec",
    },
    {
      id: 30,
      title: "A level Chemistry Paper 2",
      subject: "Art",
      level: "Form 6",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp2a,
      examBoard: "Zimsec",
    },
    {
      id: 31,
      title: "A level Chemistry Paper 3",
      subject: "Chemistry",
      level: "Form 6",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp3a,
      examBoard: "Zimsec",
    },
    {
      id: 32,
      title: "A level Art Paper 4",
      subject: "Chemistry",
      level: "Form 4",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp4a,
      examBoard: "Zimsec",
    },
    {
      id: 33,
      title: "O level Commerce Paper 1",
      subject: "Commerce",
      level: "Form 4",
      thumbnail: assets.commerce,
      pdfFile: assets.commercep1,
      examBoard: "Zimsec",
    },
    {
      id: 34,
      title: "O level Commerce Paper 2",
      subject: "Commerce",
      level: "Form 4",
      thumbnail: assets.commerce,
      pdfFile: assets.commercep2,
      examBoard: "Zimsec",
    },
    {
      id: 35,
      title: "O level Computer Science Paper 1",
      subject: "Computer Science",
      level: "Form 4",
      thumbnail: assets.computers,
      pdfFile: assets.computersp2,
      examBoard: "Zimsec",
    },
    {
      id: 36,
      title: "O level Computer Science Paper 2",
      subject: "Computer Science",
      level: "Form 4",
      thumbnail: assets.computers,
      pdfFile: assets.computersp2,
      examBoard: "Zimsec",
    },
    {
      id: 37,
      title: "O level Computer Science Paper 3",
      subject: "Computer Science",
      level: "Form 4",
      thumbnail: assets.computers,
      pdfFile: assets.computersp3,
      examBoard: "Zimsec",
    },
    {
      id: 38,
      title: "A level Computer Science Paper 1",
      subject: "Computer Science",
      level: "Form 6",
      thumbnail: assets.computers,
      pdfFile: assets.computersciencep1a,
      examBoard: "Zimsec",
    },
    {
      id: 39,
      title: "A level Computer Science Paper 2",
      subject: "Computer Science",
      level: "Form 6",
      thumbnail: assets.computers,
      pdfFile: assets.computersciencep2a,
      examBoard: "Zimsec",
    },
    {
      id: 40,
      title: "O level FARES Paper 1",
      subject: "FARES",
      level: "Form 4",
      thumbnail: assets.fareme,
      pdfFile: assets.faresp1,
      examBoard: "Zimsec",
    },
    {
      id: 41,
      title: "O level FARES Paper 2",
      subject: "FARES",
      level: "Form 4",
      thumbnail: assets.fareme,
      pdfFile: assets.faresp1,
      examBoard: "Zimsec",
    },
    {
      id: 42,
      title: "A level FARES Paper 1",
      subject: "FARES",
      level: "Form 6",
      thumbnail: assets.fareme,
      pdfFile: assets.faresp1a,
      examBoard: "Zimsec",
    },
    {
      id: 43,
      title: "A level FARES Paper 2",
      subject: "FARES",
      level: "Form 4",
      thumbnail: assets.fareme,
      pdfFile: assets.faresp2a,
      examBoard: "Zimsec",
    },
    {
      id: 44,
      title: "O level Textile Design and Technology Paper 1",
      subject: "Textile Design and Technology",
      level: "Form 4",
      thumbnail: assets.fashion,
      pdfFile: assets.fashionp1,
      examBoard: "Zimsec",
    },
    {
      id: 45,
      title: "A level Textile Design and Technology Paper 1",
      subject: "Textile Design and Technology",
      level: "Form 6",
      thumbnail: assets.fashion,
      pdfFile: assets.fashionp1a,
      examBoard: "Zimsec",
    },
    {
      id: 46,
      title: "A level Textile Design and Technology Paper 2",
      subject: "Textile Design and Technology",
      level: "Form 4",
      thumbnail: assets.fashion,
      pdfFile: assets.fashionp1a,
      examBoard: "Zimsec",
    },
    {
      id: 47,
      title: "O level Foods and Nutrition Paper 1",
      subject: "Foods and Nutrition",
      level: "Form 4",
      thumbnail: assets.foods,
      pdfFile: assets.foodsp1,
      examBoard: "Zimsec",
    },
    {
      id: 48,
      title: "O level Foods and Nutrition Paper 2",
      subject: "Foods and Nutrition",
      level: "Form 4",
      thumbnail: assets.foods,
      pdfFile: assets.foodsp2,
      examBoard: "Zimsec",
    },
    {
      id: 49,
      title: "A level Foods and Nutrition Paper 1",
      subject: "Foods and Nutrition",
      level: "Form 6",
      thumbnail: assets.foods,
      pdfFile: assets.foodp1,
      examBoard: "Zimsec",
    },
    {
      id: 50,
      title: "A level Foods and Nutrition Paper 2",
      subject: "Foods and Nutrition",
      level: "Form 6",
      thumbnail: assets.foods,
      pdfFile: assets.foodp2,
      examBoard: "Zimsec",
    },
    {
      id: 51,
      title: "O level Geography Paper 1",
      subject: "Geography",
      level: "Form 4",
      thumbnail: assets.geo,
      pdfFile: assets.geop1,
      examBoard: "Zimsec",
    },
    {
      id: 52,
      title: "O level Geography Paper 2",
      subject: "Geography",
      level: "Form 4",
      thumbnail: assets.geo,
      pdfFile: assets.geop2,
      examBoard: "Zimsec",
    },
    {
      id: 53,
      title: "A level Geography Paper 1",
      subject: "Geography",
      level: "Form 6",
      thumbnail: assets.geo,
      pdfFile: assets.geop1a,
      examBoard: "Zimsec",
    },
    {
      id: 54,
      title: "A level Geography Paper 2",
      subject: "Geography",
      level: "Form 6",
      thumbnail: assets.geo,
      pdfFile: assets.geop2a,
      examBoard: "Zimsec",
    },
    {
      id: 55,
      title: "A level Geography Paper 3",
      subject: "Geography",
      level: "Form 6",
      thumbnail: assets.geo,
      pdfFile: assets.geop3a,
      examBoard: "Zimsec",
    },
    {
      id: 56,
      title: "A level History Paper 1",
      subject: "History",
      level: "Form 4",
      thumbnail: assets.history,
      pdfFile: assets.historyp1a,
      examBoard: "Zimsec",
    },
    {
      id: 57,
      title: "O level Maths Paper 1",
      subject: "Maths",
      level: "Form 4",
      thumbnail: assets.maths,
      pdfFile: assets.mathsp1,
      examBoard: "Zimsec",
    },
    {
      id: 58,
      title: "O level Maths Paper 2",
      subject: "Maths",
      level: "Form 4",
      thumbnail: assets.maths,
      pdfFile: assets.mathsp2,
      examBoard: "Zimsec",
    },
    {
      id: 59,
      title: "O level Metal Work Paper 1",
      subject: "Metal Work",
      level: "Form 4",
      thumbnail: assets.metal,
      pdfFile: assets.metalp1,
      examBoard: "Zimsec",
    },
    {
      id: 60,
      title: "O level Metal Work Paper 2",
      subject: "Metal Work",
      level: "Form 4",
      thumbnail: assets.metal,
      pdfFile: assets.metalp2,
      examBoard: "Zimsec",
    },
    {
      id: 61,
      title: "O level Metal Work Paper 3",
      subject: "Metal Work",
      level: "Form 4",
      thumbnail: assets.metal,
      pdfFile: assets.metalp3,
      examBoard: "Zimsec",
    },
    {
      id: 62,
      title: "A level Metal Work Paper 1",
      subject: "Metal Work",
      level: "Form 4",
      thumbnail: assets.metal,
      pdfFile: assets.metalp1a,
      examBoard: "Zimsec",
    },
    {
      id: 63,
      title: "A level Metal Work Paper 2",
      subject: "Metal Work",
      level: "Form 6",
      thumbnail: assets.metal,
      pdfFile: assets.metalp2a,
      examBoard: "Zimsec",
    },
    {
      id: 64,
      title: "A level Metal Work Paper 3",
      subject: "Metal Work",
      level: "Form 6",
      thumbnail: assets.metal,
      pdfFile: assets.metalp1,
      examBoard: "Zimsec",
    },
    {
      id: 65,
      title: "A level Metal Work Paper 4",
      subject: "Metal Work",
      level: "Form 6",
      thumbnail: assets.metal,
      pdfFile: assets.metalp4a,
      examBoard: "Zimsec",
    },
    {
      id: 66,
      title: "O level Music Paper 1",
      subject: "Music",
      level: "Form 4",
      thumbnail: assets.music,
      pdfFile: assets.musicp1,
      examBoard: "Zimsec",
    },
    {
      id: 67,
      title: "O level Music Paper 2",
      subject: "Music",
      level: "Form 4",
      thumbnail: assets.music,
      pdfFile: assets.musicp2,
      examBoard: "Zimsec",
    },
    {
      id: 68,
      title: "O level Music Paper 3",
      subject: "Music",
      level: "Form 4",
      thumbnail: assets.music,
      pdfFile: assets.musicp3,
      examBoard: "Zimsec",
    },
    {
      id: 69,
      title: "A level Music Paper 1",
      subject: "Music",
      level: "Form 6",
      thumbnail: assets.music,
      pdfFile: assets.musicp1a,
      examBoard: "Zimsec",
    },
    {
      id: 70,
      title: "A level Music Paper 2",
      subject: "Music",
      level: "Form 6",
      thumbnail: assets.music,
      pdfFile: assets.musicp2a,
      examBoard: "Zimsec",
    },
    {
      id: 71,
      title: "O level PE Paper 1",
      subject: "Physical Education",
      level: "Form 4",
      thumbnail: assets.pe,
      pdfFile: assets.pep1,
      examBoard: "Zimsec",
    },
    {
      id: 105,
      title: "O level PE Paper 2",
      subject: "Physical Education",
      level: "Form 4",
      thumbnail: assets.pe,
      pdfFile: assets.pep2,
      examBoard: "Zimsec",
    },
    {
      id: 72,
      title: "O level PE Paper 3",
      subject: "Physical Education",
      level: "Form 4",
      thumbnail: assets.pe,
      pdfFile: assets.pep3,
      examBoard: "Zimsec",
    },
    {
      id: 73,
      title: "A level PE Paper 1",
      subject: "Physical Education",
      level: "Form 6",
      thumbnail: assets.pe,
      pdfFile: assets.pep1a,
      examBoard: "Zimsec",
    },
    {
      id: 74,
      title: "A level PE Paper 2",
      subject: "Physical Education",
      level: "Form 6",
      thumbnail: assets.pe,
      pdfFile: assets.pep2a,
      examBoard: "Zimsec",
    },
    {
      id: 75,
      title: "A level PE Paper 3",
      subject: "Physical Education",
      level: "Form 6",
      thumbnail: assets.pe,
      pdfFile: assets.pep3a,
      examBoard: "Zimsec",
    },
    {
      id: 76,
      title: "O level Physics Paper 1",
      subject: "Physical Education",
      level: "Form 4",
      thumbnail: assets.physics,
      pdfFile: assets.physicsp1,
      examBoard: "Zimsec",
    },
    {
      id: 77,
      title: "O level Physics Paper 2",
      subject: "Physical Education",
      level: "Form 4",
      thumbnail: assets.physics,
      pdfFile: assets.physicsp2,
      examBoard: "Zimsec",
    },
    {
      id: 78,
      title: "O level Physics Paper 3",
      subject: "Physical Education",
      level: "Form 4",
      thumbnail: assets.physics,
      pdfFile: assets.physicsp3,
      examBoard: "Zimsec",
    },
    {
      id: 79,
      title: "A level Physics Paper 1",
      subject: "Physical Education",
      level: "Form 6",
      thumbnail: assets.physics,
      pdfFile: assets.physicsp1a,
      examBoard: "Zimsec",
    },
    {
      id: 80,
      title: "A level Physics Paper 2",
      subject: "Physical Education",
      level: "Form 6",
      thumbnail: assets.physics,
      pdfFile: assets.physicsp2a,
      examBoard: "Zimsec",
    },
    {
      id: 81,
      title: "O level PE Paper 3",
      subject: "Physical Education",
      level: "Form 6",
      thumbnail: assets.physics,
      pdfFile: assets.physicsp3a,
      examBoard: "Zimsec",
    },
    {
      id: 82,
      title: "O level Physics Paper 4",
      subject: "Physical Education",
      level: "Form 6",
      thumbnail: assets.physics,
      pdfFile: assets.physicsp4a,
      examBoard: "Zimsec",
    },
    {
      id: 83,
      title: "O level Combined Science Paper 1",
      subject: "Combined Science",
      level: "Form 4",
      thumbnail: assets.science,
      pdfFile: assets.sciencep1,
      examBoard: "Zimsec",
    },
    {
      id: 84,
      title: "O level Combined Science Paper 2",
      subject: "Combined Science",
      level: "Form 4",
      thumbnail: assets.science,
      pdfFile: assets.sciencep2,
      examBoard: "Zimsec",
    },
    {
      id: 85,
      title: "O level Combined Science Paper 3",
      subject: "Combined Science",
      level: "Form 4",
      thumbnail: assets.science,
      pdfFile: assets.sciencep3,
      examBoard: "Zimsec",
    },
    {
      id: 86,
      title: "O level Combined Science Paper 3",
      subject: "Combined Science",
      level: "Form 4",
      thumbnail: assets.science,
      pdfFile: assets.sciencep32,
      examBoard: "Zimsec",
    },
    {
      id: 87,
      title: "O level Combined Science Paper 3",
      subject: "Combined Science",
      level: "Form 4",
      thumbnail: assets.science,
      pdfFile: assets.sciencep3,
      examBoard: "Zimsec",
    },
    {
      id: 88,
      title: "O level Shona Paper 1",
      subject: "Shona",
      level: "Form 4",
      thumbnail: assets.shona,
      pdfFile: assets.shonap1,
      examBoard: "Zimsec",
    },
    {
      id: 89,
      title: "O level Shona Paper 2",
      subject: "Shona",
      level: "Form 4",
      thumbnail: assets.shona,
      pdfFile: assets.shonap2,
      examBoard: "Zimsec",
    },
    {
      id: 90,
      title: "O level Technical Graphics Paper 1",
      subject: "Technical Graphics",
      level: "Form 4",
      thumbnail: assets.technical,
      pdfFile: assets.tgp1,
      examBoard: "Zimsec",
    },
    {
      id: 91,
      title: "O level Technical Graphics Paper 2",
      subject: "Technical Graphics",
      level: "Form 4",
      thumbnail: assets.technical,
      pdfFile: assets.tgp2,
      examBoard: "Zimsec",
    },
    {
      id: 92,
      title: "O Technical Graphics Paper 3",
      subject: "Technical Graphics",
      level: "Form 4",
      thumbnail: assets.technical,
      pdfFile: assets.tgp3,
      examBoard: "Zimsec",
    },
    {
      id: 93,
      title: "A level Technical Graphics Paper 1",
      subject: "Technical Graphics",
      level: "Form 6",
      thumbnail: assets.technical,
      pdfFile: assets.sciencep3,
      examBoard: "Zimsec",
    },
    {
      id: 94,
      title: "A level Technical Graphics Paper 2",
      subject: "Technical Graphics",
      level: "Form 6",
      thumbnail: assets.technical,
      pdfFile: assets.tgp2a,
      examBoard: "Zimsec",
    },
    {
      id: 95,
      title: "A level Technical Graphics Paper 3",
      subject: "Technical Graphics",
      level: "Form 6",
      thumbnail: assets.technical,
      pdfFile: assets.tgp3a,
      examBoard: "Zimsec",
    },
    {
      id: 96,
      title: "O level Woodwork Paper 1",
      subject: "Woodwork",
      level: "Form 4",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp1,
      examBoard: "Zimsec",
    },
    {
      id: 97,
      title: "O level Woodwork Paper 2",
      subject: "Woodwork",
      level: "Form 4",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp2,
      examBoard: "Zimsec",
    },
    {
      id: 98,
      title: "O level Woodwork Paper 1",
      subject: "Woodwork",
      level: "Form 4",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp1,
      examBoard: "Zimsec",
    },
    {
      id: 99,
      title: "O level Woodwork Paper 2",
      subject: "Woodwork",
      level: "Form 4",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp2,
      examBoard: "Zimsec",
    },
    {
      id: 100,
      title: "O level Woodwork Paper 3",
      subject: "Woodwork",
      level: "Form 4",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp3,
      examBoard: "Zimsec",
    },
    {
      id: 101,
      title: "A level Woodwork Paper 1",
      subject: "Woodwork",
      level: "Form 6",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp1a,
      examBoard: "Zimsec",
    },
    {
      id: 102,
      title: "A level Woodwork Paper 2",
      subject: "Woodwork",
      level: "Form 6",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp2a,
      examBoard: "Zimsec",
    },
    {
      id: 103,
      title: "A level Woodwork Paper 3",
      subject: "Woodwork",
      level: "Form 6",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp3a,
      examBoard: "Zimsec",
    },
    {
      id: 104,
      title: "A level Woodwork Paper 4",
      subject: "Woodwork",
      level: "Form 6",
      thumbnail: assets.woodwork,
      pdfFile: assets.woodp4a,
      examBoard: "Zimsec",
    },
    {
      id: 106,
      title: "AS and A level Accounting Paper 3 insert nov 2024 9706/31",
      subject: "Accounting",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountingp3insertnov2024,
      examBoard: "Cambridge",
    },
    {
      id: 107,
      title: "AS and A level Accounting Paper 4  nov 2024 9706/41",
      subject: "Accounting",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountingp4nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 108,
      title: "AS and A level Accounting Paper 4  nov 2024 9706/42",
      subject: "Accounting",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountingp4nov20242,
      examBoard: "Cambridge",
    },
    {
      id: 109,
      title: "AS and A level Accounting Paper 3  nov 2024 9706/33",
      subject: "Accounting",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountingp32024,
      examBoard: "Cambridge",
    },
    {
      id: 110,
      title: "AS and A level Accounting Paper 4  nov 2024 9706/42",
      subject: "Accounting",
      level: "Form 6",
      thumbnail: assets.accounts,
      pdfFile: assets.accountingp4nov20242,
      examBoard: "Cambridge",
    },
    {
      id: 111,
      title: "AS and A level Art Paper 1  nov 2019 9704/01",
      subject: "Art",
      level: "Form 6",
      thumbnail: assets.art,
      pdfFile: assets.artp1nov2019,
      examBoard: "Cambridge",
    },
    {
      id: 112,
      title: "AS and A level Art Paper 2  nov 2019 9704/02",
      subject: "Art",
      level: "Form 6",
      thumbnail: assets.art,
      pdfFile: assets.artp2nov2019,
      examBoard: "Cambridge",
    },
    {
      id: 113,
      title: "AS and A level Biology Paper 1  june 2014 9184/13",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop1june2014,
      examBoard: "Cambridge",
    },
    {
      id: 114,
      title: "AS and A level Biology Paper 1  june 2014 9184/35",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop1june20142,
      examBoard: "Cambridge",
    },
    {
      id: 115,
      title: "AS and A level Biology Paper 2  june 2014 9184/23",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop2june2014,
      examBoard: "Cambridge",
    },
    {
      id: 116,
      title: "AS and A level Biology Paper 3  nov 2024 9700/31",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop3nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 117,
      title: "AS and A level Biology Paper 3  nov 2024 9700/33",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop3nov20242,
      examBoard: "Cambridge",
    },
    {
      id: 118,
      title: "AS and A level Biology Paper 3  nov 2024 9700/34",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop3nov20243,
      examBoard: "Cambridge",
    },
    {
      id: 119,
      title: "AS and A level Biology Paper 2  nov 2024 9700/35",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop3nov20244,
      examBoard: "Cambridge",
    },
    {
      id: 120,
      title: "AS and A level Biology Paper 4  june 2014 9184/43",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop4june2014,
      examBoard: "Cambridge",
    },
    {
      id: 121,
      title: "AS and A level Biology Paper 5  june 2014 9184/53",
      subject: "Biology",
      level: "Form 6",
      thumbnail: assets.biology,
      pdfFile: assets.biop5june2014,
      examBoard: "Cambridge",
    },
    {
      id: 122,
      title: "AS and A level Business Paper 1  nov 2024 9609/13",
      subject: "Business",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessp1,
      examBoard: "Cambridge",
    },
    {
      id: 123,
      title: "AS and A level Business Paper 1  nov 2024 9609/11",
      subject: "Business",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessp1nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 124,
      title: "AS and A level Business Paper 1  nov 2024 9609/12",
      subject: "Business",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessp1nov20242,
      examBoard: "Cambridge",
    },
    {
      id: 125,
      title: "AS and A level Business Paper 3  nov 2014 9609/32",
      subject: "Business",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessp3nov2014,
      examBoard: "Cambridge",
    },
    {
      id: 126,
      title: "AS and A level Business Paper 3  nov 2014 9609/33",
      subject: "Business",
      level: "Form 6",
      thumbnail: assets.business,
      pdfFile: assets.businessp3nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 127,
      title: "AS and A level Chemistry Paper 1  june 2024 9185/13",
      subject: "Chemistry",
      level: "Form 6",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp1june,
      examBoard: "Cambridge",
    },
    {
      id: 128,
      title: "AS and A level Chemistry Paper 1  nov 2024 9701/11",
      subject: "Chemistry",
      level: "Form 6",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp1nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 129,
      title: "AS and A level Chemistry Paper 1  nov 2024 9701/12",
      subject: "Chemistry",
      level: "Form 6",
      thumbnail: assets.chemistry,
      pdfFile: assets.chemistryp1nov20242,
      examBoard: "Cambridge",
    },
    {
      id: 130,
      title: " Grade 7 Social Science Paper 1",
      subject: "Social Science",
      level: "Grade 7",
      thumbnail: assets.science_sub,
      pdfFile: assets.social_scienceg7p1,
      examBoard: "Zimsec",
    },
    {
      id: 131,
      title: " Grade 7 Social Science Paper 2",
      subject: "Social Science",
      level: "Grade 7",
      thumbnail: assets.science_sub,
      pdfFile: assets.social_scienceg7p2,
      examBoard: "Zimsec",
    },
    {
      id: 132,
      title: " Grade 7 Maths Paper 1",
      subject: "Maths",
      level: "Grade 7",
      thumbnail: assets.maths,
      pdfFile: assets.mathsg7p12,
      examBoard: "Zimsec",
    },
    {
      id: 133,
      title: " Grade 7 Maths Paper 2",
      subject: "Maths",
      level: "Grade 7",
      thumbnail: assets.maths,
      pdfFile: assets.mathsg7p2,
      examBoard: "Zimsec",
    },
    {
      id: 134,
      title: " Grade 7 English Paper 1",
      subject: "English",
      level: "Grade 7",
      thumbnail: assets.english,
      pdfFile: assets.englishg7p1,
      examBoard: "Zimsec",
    },
    {
      id: 135,
      title: " Grade 7 English Paper 2",
      subject: "English",
      level: "Grade 7",
      thumbnail: assets.english,
      pdfFile: assets.englishg7p2,
      examBoard: "Zimsec",
    },
    {
      id: 136,
      title: " Grade 7 Agric, Science and Tech Paper 1",
      subject: "Agric, Science and Tech",
      level: "Grade 7",
      thumbnail: assets.agriculture,
      pdfFile: assets.agric_scientechg7p1,
      examBoard: "Zimsec",
    },
    {
      id: 137,
      title: " Grade 7 Agric, Science and Tech Paper 2",
      subject: "Agric, Science and Tech",
      level: "Grade 7",
      thumbnail: assets.agriculture,
      pdfFile: assets.agric_scientechg7p2,
      examBoard: "Zimsec",
    },
    {
      id: 137,
      title: " Grade 7 Agric, Science and Tech Paper 2",
      subject: "Agric, Science and Tech",
      level: "Grade 7",
      thumbnail: assets.agriculture,
      pdfFile: assets.agric_scientechg7p2,
      examBoard: "Zimsec",
    },
    {
      id: 137,
      title: " Grade 7 Agric, Science and Tech Paper 2",
      subject: "Agric, Science and Tech",
      level: "Grade 7",
      thumbnail: assets.agriculture,
      pdfFile: assets.agric_scientechg7p2,
      examBoard: "Zimsec",
    },
    {
      id: 138,
      title: " Grade 7 Agric, Science and Tech Paper 1",
      subject: "Agric, Science and Tech",
      level: "Grade 7",
      thumbnail: assets.agriculture,
      pdfFile: assets.grade_7_Agric_2017,
      examBoard: "Zimsec",
    },
    {
      id: 139,
      title: " Grade 7 Maths Paper 1",
      subject: "Maths",
      level: "Grade 7",
      thumbnail: assets.maths,
      pdfFile: assets.mathsp1g7,
      examBoard: "Zimsec",
    },
    {
      id: 140,
      title: " Grade 7 Agric, Science and Tech ",
      subject: "Agric, Science and Tech",
      level: "Grade 7",
      thumbnail: assets.agriculture,
      pdfFile: assets.g7agricsciencentech,
      examBoard: "Zimsec",
    },
    {
      id: 141,
      title: " Grade 7 Maths Paper 2",
      subject: "Maths",
      level: "Grade 7",
      thumbnail: assets.maths,
      pdfFile: assets.MATHEMATHATICS_PAPER_2__26_MARCH,
      examBoard: "Zimsec",
    },
    {
      id: 142,
      title: " Grade 7 Agric, Science and Tech Paper 2",
      subject: "Agric, Science and Tech",
      level: "Grade 7",
      thumbnail: assets.agriculture,
      pdfFile: assets.g7agricscientechp2,
      examBoard: "Zimsec",
    },
    {
      id: 143,
      title: " Grade 7 Maths Paper 2",
      subject: "Maths",
      level: "Grade 7",
      thumbnail: assets.maths,
      pdfFile: assets.MATHEMATHATICS_PAPER_2__26_MARCH,
      examBoard: "Zimsec",
    },
    {
      id: 144,
      title: " Grade 7 Shona Paper 1",
      subject: "Shona",
      level: "Grade 7",
      thumbnail: assets.shona,
      pdfFile: assets.GRADE_7_Shona,
      examBoard: "Zimsec",
    },
    {
      id: 145,
      title: " Grade 7 English Paper 1",
      subject: "English",
      level: "Grade 7",
      thumbnail: assets.english,
      pdfFile: assets.EnglishGr_7_q1_specimen_Paper,
      examBoard: "Zimsec",
    },
    {
      id: 146,
      title: " Grade 7 English Paper 1",
      subject: "English",
      level: "Grade 7",
      thumbnail: assets.english,
      pdfFile: assets.English_paper_1_NAPH,
      examBoard: "Zimsec",
    },
    {
      id: 147,
      title: " Grade 7 Shona Paper 1",
      subject: "Shona",
      level: "Grade 7",
      thumbnail: assets.shona,
      pdfFile: assets.GRADE_7_Shona,
      examBoard: "Zimsec",
    },
    {
      id: 148,
      title: " Grade 7 Maths Paper 1",
      subject: "Maths",
      level: "Grade 7",
      thumbnail: assets.maths,
      pdfFile: assets.GRADE_7_MATHS_1_PP2A,
      examBoard: "Zimsec",
    },
    {
      id: 149,
      title: " Grade 7 Maths Paper 1",
      subject: "Maths",
      level: "Grade 7",
      thumbnail: assets.maths,
      pdfFile: assets.naphmasvingog7mathsp1,
      examBoard: "Zimsec",
    },
    {
      id: 150,
      title: " Grade 7 Maths Paper 1",
      subject: "Maths",
      level: "Grade 7",
      thumbnail: assets.maths,
      pdfFile: assets.GRADESEVEN2017MATHSP1PP7,
      examBoard: "Zimsec",
    },
    {
      id: 151,
      title: " Grade 7 Maths Paper 2",
      subject: "Maths",
      level: "Grade 7",
      thumbnail: assets.maths,
      pdfFile: assets.GRADE7MATHS_P_2PP_7_B_ANSWERSS,
      examBoard: "Zimsec",
    },
    {
      id: 152,
      title: " Grade 7 Maths Paper 2",
      subject: "Maths",
      level: "Grade 7",
      thumbnail: assets.maths,
      pdfFile: assets.GRADE7MATHS_P_2PP_7_B_ANSWERSS,
      examBoard: "Zimsec",
    },
    {
      id: 153,
      title: " Grade 7 Maths Paper 2",
      subject: "Maths",
      level: "Grade 7",
      thumbnail: assets.maths,
      pdfFile: assets.Grade_7__2012_Maths_Paper_2_2,
      examBoard: "Zimsec",
    },
    {
      id: 154,
      title: " Grade 7 Shona Paper 2",
      subject: "Shona",
      level: "Grade 7",
      thumbnail: assets.shona,
      pdfFile: assets.g7shonap21,
      examBoard: "Zimsec",
    },
    {
      id: 155,
      title: " Grade 7 Shona Paper 1",
      subject: "Shona",
      level: "Grade 7",
      thumbnail: assets.shona,
      pdfFile: assets.g7naphmasvingoshonapaper1,
      examBoard: "Zimsec",
    },
    {
      id: 156,
      title: " Grade 7 Shona Paper 2",
      subject: "Shona",
      level: "Grade 7",
      thumbnail: assets.shona,
      pdfFile: assets.g7naphmasvingoshonap2,
      examBoard: "Zimsec",
    },
    {
      id: 157,
      title: " Grade 7 English Paper 1",
      subject: "English",
      level: "Grade 7",
      thumbnail: assets.english,
      pdfFile: assets.Grade7_EnglishP1Test1,
      examBoard: "Zimsec",
    },
    {
      id: 158,
      title: " Grade 7 English Paper 2",
      subject: "English",
      level: "Grade 7",
      thumbnail: assets.english,
      pdfFile: assets.g72024English_specimen_paper_2_075613,
      examBoard: "Zimsec",
    },
    {
      id: 159,
      title: " Grade 7 English Paper 2",
      subject: "English",
      level: "Grade 7",
      thumbnail: assets.english,
      pdfFile: assets.g7englishp2,
      examBoard: "Zimsec",
    },
    {
      id: 160,
      title: " Grade 7 English Paper 2",
      subject: "English",
      level: "Grade 7",
      thumbnail: assets.english,
      pdfFile: assets.englishp2g5,
      examBoard: "Zimsec",
    },
    {
      id: 161,
      title: " Grade 7 English Paper 2",
      subject: "English",
      level: "Grade 7",
      thumbnail: assets.english,
      pdfFile: assets.g7englishp21,
      examBoard: "Zimsec",
    },
    {
      id: 162,
      title: " Grade 7 English Paper 2",
      subject: "Shona",
      level: "Grade 7",
      thumbnail: assets.english,
      pdfFile: assets.g72024English_specimen_paper_2_075613,
      examBoard: "Zimsec",
    },
    {
      id: 163,
      title: " Grade 7 PE and Arts Paper 1",
      subject: "Physical Education",
      level: "Grade 7",
      thumbnail: assets.pe,
      pdfFile: assets.Grade_7_PE_and_ARTS_1_1,
      examBoard: "Zimsec",
    },
    {
      id: 164,
      title: " Grade 7 PE and Arts Paper 1",
      subject: "Physical Education",
      level: "Grade 7",
      thumbnail: assets.pe,
      pdfFile: assets.g7pep12,
      examBoard: "Zimsec",
    },
    {
      id: 165,
      title: " Grade 7 PE and Arts Paper 1",
      subject: "Physical Education",
      level: "Grade 7",
      thumbnail: assets.pe,
      pdfFile: assets.g7pep1,
      examBoard: "Zimsec",
    },
    {
      id: 166,
      title: " Grade 7 Agriculture and Science Paper 1",
      subject: "Agriculture",
      level: "Grade 7",
      thumbnail: assets.agriculture,
      pdfFile: assets.g7agricandsciencespecimen,
      examBoard: "Zimsec",
    },
    {
      id: 167,
      title: " Grade 7 Agriculture and Science Paper 2",
      subject: "Agriculture",
      level: "Grade 7",
      thumbnail: assets.agriculture,
      pdfFile: assets.Grade_7_Agric_Scie_n_Tech_Paper_2_Specimen,
      examBoard: "Zimsec",
    },
    {
      id: 168,
      title: " Grade 7 English Paper 2",
      subject: "Shona",
      level: "Grade 7",
      thumbnail: assets.english,
      pdfFile: assets.g72024English_specimen_paper_2_075613,
      examBoard: "Zimsec",
    },
    {
      id: 169,
      title: " Grade 7 Agriculture and Science Paper 2",
      subject: "Agriculture",
      level: "Grade 7",
      thumbnail: assets.agriculture,
      pdfFile: assets.g7agricp2,
      examBoard: "Zimsec",
    },
    {
      id: 170,
      title: " Grade 7 Social Sciences Paper 2",
      subject: "Social Sciences",
      level: "Grade 7",
      thumbnail: assets.science,
      pdfFile: assets.g7socialsciencep2,
      examBoard: "Zimsec",
    },
    {
      id: 171,
      title: " Grade 7 Social Sciences Paper 2",
      subject: "Social Sciences",
      level: "Grade 7",
      thumbnail: assets.science,
      pdfFile: assets.GRADE7SOCIALSCIENCESPAPER2,
      examBoard: "Zimsec",
    },
    {
      id: 172,
      title: " Grade 7 Social Sciences Paper 1",
      subject: "Social Sciences",
      level: "Grade 7",
      thumbnail: assets.science,
      pdfFile: assets.g7naphmasvingosocialsciencep1,
      examBoard: "Zimsec",
    },
    {
      id: 173,
      title: " Grade 7 Social Sciences Paper 2",
      subject: "Social Sciences",
      level: "Grade 7",
      thumbnail: assets.shona,
      pdfFile: assets.g7socialsciencep2,
      examBoard: "Zimsec",
    },
    {
      id: 174,
      title: " Grade 7 English Paper 1",
      subject: "English",
      level: "Grade 7",
      thumbnail: assets.english,
      pdfFile: assets.EnglishGr7Paper1Specimen,
      examBoard: "Zimsec",
    },
    {
      id: 175,
      title: " Grade 7 ICT Paper",
      subject: "ICT",
      level: "Grade 7",
      thumbnail: assets.computers,
      pdfFile: assets.GRADE_7_ICT_14_Oct_2021_ICT_ENTERPRISE_End_of_Unit_Test,
      examBoard: "Zimsec",
    },
    {
      id: 176,
      title: " Grade 7 PE Paper",
      subject: "Physical Education",
      level: "Grade 7",
      thumbnail: assets.pe,
      pdfFile: assets.Grade7zimsecpeandartsprep,
      examBoard: "Zimsec",
    },
    {
      id: 177,
      title: " IGCSE Chemistry Paper 1",
      subject: "Chemistry",
      level: "IGCSE",
      thumbnail: assets.chemistry,
      pdfFile: assets.IGCSEChemistryP1Nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 178,
      title: " IGCSE Chemistry Paper 1",
      subject: "Chemistry",
      level: "IGCSE",
      thumbnail: assets.chemistry,
      pdfFile: assets.IGCSEChemistryP1Nov20241,
      examBoard: "Cambridge",
    },
    {
      id: 179,
      title: " IGCSE Chemistry Paper 2",
      subject: "Chemistry",
      level: "IGCSE",
      thumbnail: assets.chemistry,
      pdfFile: assets.IGCSEChemistryP2Nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 180,
      title: " IGCSE Chemistry Paper 3",
      subject: "Chemistry",
      level: "IGCSE",
      thumbnail: assets.chemistry,
      pdfFile: assets.IGCSEChemistryP3Nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 181,
      title: " IGCSE Chemistry Paper 4",
      subject: "Chemistry",
      level: "IGCSE",
      thumbnail: assets.chemistry,
      pdfFile: assets.IGCSEChemistryP4Nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 182,
      title: " IGCSE Business Studies Paper 2",
      subject: "Business Studies",
      level: "IGCSE",
      thumbnail: assets.business,
      pdfFile: assets.IGCSEBusinessStudiesP2Nov2024,
      examBoard: "Cambridge",
    },
    {
      id: 183,
      title: " IGCSE Business Studies Paper 2",
      subject: "Business Studies",
      level: "IGCSE",
      thumbnail: assets.business,
      pdfFile: assets.IGCSEBusinessStudiesP2Nov20241,
      examBoard: "Cambridge",
    },
    {
      id: 184,
      title: " IGCSE Business Studies Paper 2",
      subject: "Business Studies",
      level: "IGCSE",
      thumbnail: assets.business,
      pdfFile: assets.IGCSEBusinessStudiesNov20241,
      examBoard: "Cambridge",
    },
    {
      id: 185,
      title: " IGCSE Business Studies Paper 1",
      subject: "Business Studies",
      level: "IGCSE",
      thumbnail: assets.business,
      pdfFile: assets.IGCSEBusinessStudiesP1Nov20241,
      examBoard: "Cambridge",
    },
    {
      id: 186,
      title: " IGCSE Business Studies Paper 1",
      subject: "Business Studies",
      level: "IGCSE",
      thumbnail: assets.business,
      pdfFile: assets.IGCSEBusinessStudiesP1Nov2024,
      examBoard: "Cambridge",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const collapsed = JSON.parse(localStorage.getItem("sidebarCollapsed")) || false;
      setIsSidebarCollapsed(collapsed);
    }, 500);
    return () => clearInterval(interval);
  }, []);

useEffect(() => {
    setPapers(samplePapers);
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const filteredPapers = papers.filter((paper) => {
    const boardMatch = examBoardFilter === "All" || paper.examBoard === examBoardFilter;
    const levelMatch =
      levelFilter === "All" ||
      (levelFilter === "Primary" && paper.level === "Grade 7") ||
      (levelFilter === "Secondary" && (paper.level === "Form 4" || paper.level === "Form 6"));
    return boardMatch && levelMatch;
  });

  const validatePDF = (blob) => {
    if (blob.size === 0) throw new Error("Empty PDF file");
    if (blob.type !== "application/pdf") throw new Error("Invalid file type");
  };

  const handleSelectPaper = async (paper) => {
    try {
      setLoading(true);
      setError("");
      setSelectedPaper(paper);
      if (!paper.pdfFile) throw new Error("PDF missing");
      const res = await fetch(paper.pdfFile);
      const blob = await res.blob();
      validatePDF(blob);
      setPdfBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setShowPreview(true);
    } catch (err) {
      console.error("Paper loading error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
  if (!pdfBlob || !selectedPaper) return;

  const file = new File([pdfBlob], `${selectedPaper.title}.pdf`, {
    type: "application/pdf",
  });

  // Get most recent workspace slug from localStorage (where it's usually cached)
  const lastWorkspaceSlug = localStorage.getItem("lastActiveWorkspace");

  // Fallback if none
  const targetPath = lastWorkspaceSlug
    ? `/workspace/${lastWorkspaceSlug}`
    : "/";

  navigate(targetPath, {
    state: {
      paperFile: file,
      paperPreview: previewUrl,
      paperTitle: selectedPaper.title,
    },
  });
};

  return (
    <div className={`paper-selector ${darkMode ? "dark" : ""}`}>
      <Sidebar />
      <main className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className="paper-selector-container">
          {/* Filters */}
          <div className="filters-container">
            <div className="exam-board-filter">
              {["All", "Zimsec", "Cambridge"].map((board) => (
                <button
                  key={board}
                  onClick={() => setExamBoardFilter(board)}
                  className={`filter-btn ${examBoardFilter === board ? "active" : ""}`}
                >
                  {board}
                </button>
              ))}
            </div>

            <div className="level-filter">
              {["All", "Primary", "Secondary"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={`filter-btn ${levelFilter === lvl ? "active" : ""}`}
                >
                  {lvl === "All" ? "All Levels" : lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Paper Grid */}
          <div className="paper-grid">
            {filteredPapers.map((paper) => (
              <motion.div
                key={paper.id}
                className={`paper-card ${
                  selectedPaper?.id === paper.id && showPreview ? "selected" : ""
                }`}
                onClick={() => handleSelectPaper(paper)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="paper-thumbnail">
                  <img
                    src={paper.thumbnail}
                    alt={paper.title}
                    onError={(e) => (e.target.src = assets.default_thumbnail)}
                  />
                  <div className="paper-badge">
                    {paper.subject} — {paper.examBoard}
                  </div>
                </div>
                <div className="paper-info">
                  <h3>{paper.title}</h3>
                  <p>{paper.level}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {filteredPapers.length === 0 && (
            <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p>No papers available for the selected filters.</p>
            </motion.div>
          )}

          {/* PDF Preview Modal */}
          {showPreview && (
            <motion.div
              className="preview-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="preview-content">
                <div className="preview-header">
                  <h3>{selectedPaper?.title}</h3>
                  <button className="close-button" onClick={() => setShowPreview(false)}>
                    ×
                  </button>
                </div>
                <div className="pdf-preview-container">
                  {loading ? (
                    <div className="loading-spinner">Loading Preview...</div>
                  ) : (
                    <iframe
                      src={previewUrl}
                      width="100%"
                      height="500px"
                      title="PDF Preview"
                      style={{ border: "none" }}
                    />
                  )}
                </div>
                <div className="preview-actions">
                  <button onClick={handleProceed} className="proceed-button" disabled={loading}>
                    Proceed to AI Interaction
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}