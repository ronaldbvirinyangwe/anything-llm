const {
  writeResponseChunk,
  clientAbortedHandler,
  formatChatHistory,
} = require("../../helpers/chat/responses");

const { NativeEmbedder } = require("../../EmbeddingEngines/native");
const {
  LLMPerformanceMonitor,
} = require("../../helpers/chat/LLMPerformanceMonitor");

const OpenAI = require("openai");
const { v4: uuidv4 } = require("uuid");

/**
 * ⚠️ CLASS NAME UNCHANGED ON PURPOSE
 * This is now vLLM-backed but preserves the Ollama interface
 * Now supports separate ports for text and vision models
 */
class OllamaAILLM {
  static modelContextWindows = {};

  constructor(embedder = null, modelPreference = null) {
    if (!process.env.VLLM_BASE_PATH)
      throw new Error("VLLM_BASE_PATH is not set");

    this.basePath = process.env.VLLM_BASE_PATH;
    this.model = process.env.OLLAMA_MODEL_PREF || modelPreference;
    this.visionModel = process.env.OLLAMA_VISION_MODEL || this.model;
    this.visionBasePath =
      process.env.VLLM_VISION_BASE_PATH || this.basePath;

    this.keepAlive = Number(process.env.OLLAMA_KEEP_ALIVE_TIMEOUT || 300);
    this.defaultTemp = 0.3;
    this.contextWindow =
      Number(process.env.OLLAMA_MODEL_TOKEN_LIMIT) || 8192;

    this.client = new OpenAI({
      baseURL: this.basePath,
      apiKey: process.env.OPENAI_API_KEY || "EMPTY",
    });

    this.visionClient = new OpenAI({
      baseURL: this.visionBasePath,
      apiKey: process.env.OPENAI_API_KEY || "EMPTY",
    });

    this.embedder = embedder ?? new NativeEmbedder();

    this.limits = {
      history: this.contextWindow * 0.15,
      system: this.contextWindow * 0.15,
      user: this.contextWindow * 0.7,
    };

    // Tracks tool names that have already been used this session.
    // These are filtered out of the tools schema before every LLM API call
    // so the model physically cannot invoke them again.
    this._usedToolNames = new Set();
  }

  /**
   * Mark a tool as used so it will be excluded from future API calls.
   * Called by plugins after they successfully execute.
   * @param {string} toolName
   */
  markToolUsed(toolName) {
    this._usedToolNames.add(toolName);
  }

  /**
   * Clear all used-tool tracking (e.g. between invocations).
   */
  resetUsedTools() {
    this._usedToolNames = new Set();
  }

  /**
   * vLLM-compatible stub.
   * Preserves Ollama interface so boot code does not break.
   */
  static async cacheContextWindows(force = false) {
    if (
      Object.keys(OllamaAILLM.modelContextWindows).length > 0 &&
      !force
    ) {
      return;
    }

    const defaultCtx =
      Number(process.env.OLLAMA_MODEL_TOKEN_LIMIT) || 128000;

    const model = process.env.OLLAMA_MODEL_PREF || "openai/gpt-oss-20b";
    const visionModel = process.env.OLLAMA_VISION_MODEL || model;

    OllamaAILLM.modelContextWindows[model] = defaultCtx;
    OllamaAILLM.modelContextWindows[visionModel] = defaultCtx;

    console.log(
      `\x1b[32m[vLLM]\x1b[0m Context windows cached (stub):`,
      OllamaAILLM.modelContextWindows
    );
  }

  streamingEnabled() {
    return true;
  }

  promptWindowLimit() {
    return this.contextWindow;
  }

  async isValidChatCompletionModel() {
    return true;
  }

  #appendContext(contextTexts = []) {
    if (!contextTexts.length) return "";
    return (
      "\nContext:\n" +
      contextTexts
        .map((t, i) => `[CONTEXT ${i}]\n${t}\n[END CONTEXT ${i}]\n`)
        .join("\n")
    );
  }

  #generateContent({ userPrompt, attachments = [] }) {
    if (!attachments.length) return userPrompt;

    const content = [{ type: "text", text: userPrompt }];
    for (const a of attachments) {
      content.push({
        type: "image_url",
        image_url: { url: a.contentString },
      });
    }
    return content;
  }

  constructPrompt({
    systemPrompt = "",
    contextTexts = [],
    chatHistory = [],
    userPrompt = "",
    attachments = [],
  }) {
    return [
      {
        role: "system",
        content: `${systemPrompt}${this.#appendContext(contextTexts)}`,
      },
      ...formatChatHistory(chatHistory, this.#generateContent, "spread"),
      {
        role: "user",
        content: this.#generateContent({ userPrompt, attachments }),
      },
    ];
  }

  async analyzeVisualContent({ name, contentString }) {
    const messages = [
      {
        role: "system",
        content:
          "You are a visual content analyzer. Extract text, structure, and meaning.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Analyze this file: ${name}` },
          { type: "image_url", image_url: { url: contentString } },
        ],
      },
    ];

    const res = await this.visionClient.chat.completions.create({
      model: this.visionModel,
      messages,
    });

    return {
      content: res.choices[0].message.content,
      model: this.visionModel,
      timestamp: new Date().toISOString(),
      filename: name,
    };
  }

  async getChatCompletion(
    messages,
    { temperature = 0.7, tools = null, tool_choice = "auto" } = {}
  ) {
    const completionParams = {
      model: this.model,
      messages,
      temperature,
    };

    if (tools && Array.isArray(tools) && tools.length > 0) {
      // Filter out tools that have already been used this session
      const filteredTools = tools.filter(
        (t) => !this._usedToolNames.has(t.function?.name)
      );
      if (filteredTools.length > 0) {
        completionParams.tools = filteredTools;
        completionParams.tool_choice = tool_choice;
      }
    }

    const measured = await LLMPerformanceMonitor.measureAsyncFunction(
      this.client.chat.completions.create(completionParams)
    );

    const choice = measured.output.choices[0];
    const msg = choice.message;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      return {
        textResponse: msg,
        metrics: {
          prompt_tokens: measured.output.usage.prompt_tokens,
          completion_tokens: measured.output.usage.completion_tokens,
          total_tokens: measured.output.usage.total_tokens,
          outputTps:
            measured.output.usage.completion_tokens / measured.duration,
          duration: measured.duration,
        },
      };
    }

    return {
      textResponse: msg.content,
      metrics: {
        prompt_tokens: measured.output.usage.prompt_tokens,
        completion_tokens: measured.output.usage.completion_tokens,
        total_tokens: measured.output.usage.total_tokens,
        outputTps:
          measured.output.usage.completion_tokens / measured.duration,
        duration: measured.duration,
      },
    };
  }

  async streamGetChatCompletion(
    messages,
    { temperature = 0.2, tools = null, tool_choice = "auto" } = {}
  ) {
    const completionParams = {
      model: this.model,
      messages,
      temperature,
      stream: true,
    };

    if (tools && Array.isArray(tools) && tools.length > 0) {
      // Filter out tools that have already been used this session
      const filteredTools = tools.filter(
        (t) => !this._usedToolNames.has(t.function?.name)
      );
      if (filteredTools.length > 0) {
        completionParams.tools = filteredTools;
        completionParams.tool_choice = tool_choice;
      }
    }

    return await LLMPerformanceMonitor.measureStream(
      this.client.chat.completions.create(completionParams),
      messages,
      false
    );
  }

  handleStream(response, stream, responseProps) {
    const { uuid = uuidv4(), sources = [] } = responseProps;

    return new Promise(async (resolve) => {
      let fullText = "";
      let toolCallsMap = {};
      let usage = {};

      const handleAbort = () => {
        clientAbortedHandler(resolve, fullText);
      };
      response.on("close", handleAbort);

      try {
        for await (const chunk of stream) {
          if (chunk.choices?.[0]?.delta?.tool_calls) {
            const toolCallDeltas = chunk.choices[0].delta.tool_calls;

            for (const delta of toolCallDeltas) {
              const index = delta.index || 0;

              if (!toolCallsMap[index]) {
                toolCallsMap[index] = {
                  id: delta.id || `tool_${index}`,
                  type: "function",
                  function: {
                    name: "",
                    arguments: "",
                  },
                };
              }

              if (delta.function?.name) {
                toolCallsMap[index].function.name += delta.function.name;
              }

              if (delta.function?.arguments) {
                toolCallsMap[index].function.arguments +=
                  delta.function.arguments;
                console.log("🧩 Tool call detected in stream:", toolCallDeltas);
              }
            }

            continue;
          }

          const delta = chunk.choices?.[0]?.delta?.content;
          if (!delta) continue;

          fullText += delta;
          writeResponseChunk(response, {
            uuid,
            sources,
            type: "textResponseChunk",
            textResponse: delta,
            close: false,
            error: false,
          });
        }

        const toolCallsArray = Object.values(toolCallsMap);
        if (toolCallsArray.length > 0) {
          console.log(
            `✅ Tool call fully accumulated: ${toolCallsArray[0].function.name}`
          );
          console.log(
            `✅ Complete arguments: ${toolCallsArray[0].function.arguments}`
          );

          response.removeListener("close", handleAbort);
          resolve({ tool_calls: toolCallsArray, fullText });
          return;
        }

        writeResponseChunk(response, {
          uuid,
          sources,
          type: "textResponseChunk",
          textResponse: "",
          close: true,
          error: false,
        });

        response.removeListener("close", handleAbort);
        resolve(fullText);
      } catch (e) {
        writeResponseChunk(response, {
          uuid,
          sources: [],
          type: "textResponseChunk",
          textResponse: "",
          close: true,
          error: `vLLM stream error: ${e.message}`,
        });
        response.removeListener("close", handleAbort);
        resolve(fullText);
      }
    });
  }

  async embedTextInput(text) {
    return this.embedder.embedTextInput(text);
  }

  async embedChunks(chunks) {
    return this.embedder.embedChunks(chunks);
  }

  async compressMessages(promptArgs, rawHistory, user) {
    const { messageArrayCompressor } = require("../../helpers/chat");
    const messageArray = this.constructPrompt(promptArgs);
    return await messageArrayCompressor(this, messageArray, rawHistory, user);
  }
}

module.exports = { OllamaAILLM };