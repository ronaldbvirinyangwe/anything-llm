const WATCH_DIRECTORY = process.env.WATCH_DIRECTORY || 
  require("path").resolve(__dirname, "../hotdir");

const ACCEPTED_MIMES = {
  "text/plain": [".txt", ".md", ".org", ".adoc", ".rst"],
  "text/html": [".html"],
  "text/csv": [".csv"],
  "application/json": [".json"],
  // TODO: Create asDoc.js that works for standard MS Word files.
  // "application/msword": [".doc"],

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    ".pptx",
  ],

  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],

  "application/vnd.oasis.opendocument.text": [".odt"],
  "application/vnd.oasis.opendocument.presentation": [".odp"],

  "application/pdf": [".pdf"],
  "application/mbox": [".mbox"],

  "audio/wav": [".wav"],
  "audio/mpeg": [".mp3"],

  "video/mp4": [".mp4"],
  "video/mpeg": [".mpeg"],
  "application/epub+zip": [".epub"],
  "image/png": [".png"],
  "image/jpeg": [".jpg"],
  "image/jpg": [".jpg"],
  "image/webp": [".webp"],
};

const SUPPORTED_FILETYPE_CONVERTERS = {
  ".txt":  "../processSingleFile/convert/asTxt.js",
  ".md":   "../processSingleFile/convert/asTxt.js",
  ".org":  "../processSingleFile/convert/asTxt.js",
  ".adoc": "../processSingleFile/convert/asTxt.js",
  ".rst":  "../processSingleFile/convert/asTxt.js",
  ".csv":  "../processSingleFile/convert/asTxt.js",
  ".json": "../processSingleFile/convert/asTxt.js",
  ".html": "../processSingleFile/convert/asTxt.js",

  ".pdf":  "../processSingleFile/convert/asPDF/index.js",
  ".docx": "../processSingleFile/convert/asDocx.js",
  ".pptx": "../processSingleFile/convert/asOfficeMime.js",
  ".odt":  "../processSingleFile/convert/asOfficeMime.js",
  ".odp":  "../processSingleFile/convert/asOfficeMime.js",
  ".xlsx": "../processSingleFile/convert/asXlsx.js",
  ".mbox": "../processSingleFile/convert/asMbox.js",
  ".epub": "../processSingleFile/convert/asEPub.js",
  ".mp3":  "../processSingleFile/convert/asAudio.js",
  ".wav":  "../processSingleFile/convert/asAudio.js",
  ".mp4":  "../processSingleFile/convert/asAudio.js",
  ".mpeg": "../processSingleFile/convert/asAudio.js",
  ".png":  "../processSingleFile/convert/asImage.js",
  ".jpg":  "../processSingleFile/convert/asImage.js",
  ".jpeg": "../processSingleFile/convert/asImage.js",
  ".webp": "../processSingleFile/convert/asImage.js",
};

module.exports = {
  SUPPORTED_FILETYPE_CONVERTERS,
  WATCH_DIRECTORY,
  ACCEPTED_MIMES,
};
