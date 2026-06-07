const { webBrowsing } = require("./web-browsing.js");
const { webScraping } = require("./web-scraping.js");
const { websocket } = require("./websocket.js");
const { docSummarizer } = require("./summarize.js");
const { saveFileInBrowser } = require("./save-file-browser.js");
const { chatHistory } = require("./chat-history.js");
const { memory } = require("./memory.js");
const { rechart } = require("./rechart.js");
const { sqlAgent } = require("./sql-agent/index.js");
const { generateNotes } = require("./generate-notes"); 
const {explainConcept} = require("./explain-concept");
const { checkMyAnswer } = require("./check-my-answer.js");
const {StudyPlanner} = require("./study-planner.js");
const { StudyPlannerElicit } = require("./studyPlannerElicit.js");
const {StudyContext} = require("./study-context.js");
const {StudyTracker} = require("./study-tracker.js");
const {FollowUpQuestions} = require("./follow-up-questions.js");
const {StudyOnboarding} = require("./study-onboarding.js")

module.exports = {
  webScraping,
  webBrowsing,
  websocket,
  docSummarizer,
  saveFileInBrowser,
  chatHistory,
  memory,
  rechart,
  sqlAgent,
  generateNotes,
  explainConcept,
  checkMyAnswer,
    StudyPlannerElicit,
  StudyPlanner,
  StudyContext,
  StudyTracker,
  FollowUpQuestions,
  StudyOnboarding,

  // Plugin name aliases so they can be pulled by slug as well.
  [webScraping.name]: webScraping,
  [webBrowsing.name]: webBrowsing,
  [websocket.name]: websocket,
  [docSummarizer.name]: docSummarizer,
  [saveFileInBrowser.name]: saveFileInBrowser,
  [chatHistory.name]: chatHistory,
  [memory.name]: memory,
  [rechart.name]: rechart,
  [sqlAgent.name]: sqlAgent,
  [generateNotes.name]: generateNotes,
  [explainConcept.name]: explainConcept,
  [checkMyAnswer.name]: checkMyAnswer,
    [StudyPlannerElicit.name]: StudyPlannerElicit,
  [StudyPlanner.name]: StudyPlanner,
[StudyContext.name]: StudyContext,
[StudyTracker.name]: StudyTracker,
[FollowUpQuestions.name]: FollowUpQuestions,
[StudyOnboarding.name]: StudyOnboarding,
};
