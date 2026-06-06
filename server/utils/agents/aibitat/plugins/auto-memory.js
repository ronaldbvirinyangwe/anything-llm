const { v4 } = require("uuid");
const { getVectorDbClass, getLLMProvider } = require("../../../helpers");

const AUTO_SAVE_THRESHOLD = 20; // messages between saves
const LAST_SAVED_KEY = "auto-memory-last-saved";

const autoMemory = {
  name: "auto-memory",
  startupConfig: {
    params: {},
  },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        let messagesSinceLastSave = 0;
        let isSaving = false;

        aibitat.onMessage(async (_chat, instance) => {
          // Avoid triggering during an ongoing save
          if (isSaving) return;

          messagesSinceLastSave++;
          if (messagesSinceLastSave < AUTO_SAVE_THRESHOLD) return;

          isSaving = true;
          messagesSinceLastSave = 0;

          try {
            const workspace =
              instance.handlerProps.invocation.workspace;

            // Get recent chat history to summarize
            const recentChats = instance._chats
              .filter((c) => c.state === "success")
              .slice(-AUTO_SAVE_THRESHOLD)
              .map((c) => `${c.from}: ${c.content}`)
              .join("\n");

            if (!recentChats) return;

            instance.introspect?.(
              `Auto-memory: Conversation is getting long — summarizing and saving to memory...`
            );

            // Use the workspace LLM to summarize
            const LLMConnector = getLLMProvider({
              provider: workspace?.chatProvider,
              model: workspace?.chatModel,
            });

            const summary = await LLMConnector.sendChat(
              [
                {
                  role: "user",
                  content: `Summarize the key facts, decisions, and context from this conversation snippet. Be concise but complete:\n\n${recentChats}`,
                },
              ],
              0.3, // low temperature for factual summary
              [],
              []
            );

            if (!summary) return;

            // Store the summary into the vector DB
            const vectorDB = getVectorDbClass();
            const { error } = await vectorDB.addDocumentToNamespace(
              workspace.slug,
              {
                docId: v4(),
                id: v4(),
                url: "file://auto-memory.txt",
                title: "auto-memory.txt",
                docAuthor: "@auto-memory",
                description: "Automatically saved conversation summary",
                docSource: "Auto-saved by the auto-memory plugin.",
                chunkSource: "",
                published: new Date().toLocaleString(),
                wordCount: summary.split(" ").length,
                pageContent: `[Auto-saved summary - ${new Date().toLocaleString()}]\n${summary}`,
                token_count_estimate: 0,
              },
              null
            );

            if (error) {
              instance.handlerProps.log(
                `auto-memory: Failed to save summary. ${error}`
              );
              return;
            }

            instance.introspect?.(
              `Auto-memory: Conversation summary saved to long-term memory.`
            );
          } catch (err) {
            instance.handlerProps.log(
              `auto-memory: Error during auto-save. ${err.message}`
            );
          } finally {
            isSaving = false;
          }
        });
      },
    };
  },
};

module.exports = { autoMemory };