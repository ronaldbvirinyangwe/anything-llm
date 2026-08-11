const { EventEmitter } = require("events");
const { APIError } = require("./error.js");
const Providers = require("./providers/index.js");
const { Telemetry } = require("../../../models/telemetry.js");
const {
  validateJsonSchema,
} = require("../../educationalSkills/schemaValidator.js");

const DEFAULT_MAX_TOOL_CALLS = 20;
const DEFAULT_MAX_TOOL_REPEATS = 5;
const DEFAULT_MAX_UNKNOWN_TOOL_RETRIES = 2;

function boundedLimit(value, fallback) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

/**
 * AIbitat is a class that manages the conversation between agents.
 * It is designed to solve a task with LLM.
 *
 * Guiding the chat through a graph of agents.
 */
class AIbitat {
  emitter = new EventEmitter();

  /**
   * Temporary flag to skip the handleExecution function
   * This is used to return the result of a flow execution directly to the chat
   * without going through the handleExecution function (resulting in more LLM processing)
   *
   * Setting Skip execution to true will prevent any further tool calls from being executed.
   * This is useful for flow executions that need to return a result directly to the chat but
   * can also prevent tool-call chaining.
   *
   * @type {boolean}
   */
  skipHandleExecution = false;
  terminateAfterReply = false;

  provider = null;
  defaultProvider = null;
  defaultInterrupt;
  maxRounds;
  maxToolCalls;
  maxToolRepeats;
  maxUnknownToolRetries;
  _chats;

  agents = new Map();
  channels = new Map();
  functions = new Map();

  constructor(props = {}) {
    const {
      chats = [],
      interrupt = "NEVER",
      maxRounds = 100,
      maxToolCalls = DEFAULT_MAX_TOOL_CALLS,
      maxToolRepeats = DEFAULT_MAX_TOOL_REPEATS,
      maxUnknownToolRetries = DEFAULT_MAX_UNKNOWN_TOOL_RETRIES,
      provider = "openai",
      handlerProps = {}, // Inherited props we can spread so aibitat can access.
      ...rest
    } = props;
    this._chats = chats;
    this.defaultInterrupt = interrupt;
    this.maxRounds = maxRounds;
    this.maxToolCalls = boundedLimit(maxToolCalls, DEFAULT_MAX_TOOL_CALLS);
    this.maxToolRepeats = boundedLimit(
      maxToolRepeats,
      DEFAULT_MAX_TOOL_REPEATS
    );
    this.maxUnknownToolRetries = boundedLimit(
      maxUnknownToolRetries,
      DEFAULT_MAX_UNKNOWN_TOOL_RETRIES
    );
    this.handlerProps = handlerProps;

    this.defaultProvider = {
      provider,
      ...rest,
    };
    this.provider = this.defaultProvider.provider;
    this.model = this.defaultProvider.model;
  }

  /**
   * Get the chat history between agents and channels.
   */
  get chats() {
    return this._chats;
  }

  /**
   * Install a plugin.
   */
  use(plugin) {
    plugin.setup(this);
    return this;
  }

  /**
   * Add a new agent to the AIbitat.
   *
   * @param name
   * @param config
   * @returns
   */
  agent(name = "", config = {}) {
    this.agents.set(name, config);
    return this;
  }

  /**
   * Add a new channel to the AIbitat.
   *
   * @param name
   * @param members
   * @param config
   * @returns
   */
  channel(name = "", members = [""], config = {}) {
    this.channels.set(name, {
      members,
      ...config,
    });
    return this;
  }

  /**
   * Get the specific agent configuration.
   *
   * @param agent The name of the agent.
   * @throws When the agent configuration is not found.
   * @returns The agent configuration.
   */
  getAgentConfig(agent = "") {
    const config = this.agents.get(agent);
    if (!config) {
      throw new Error(`Agent configuration "${agent}" not found`);
    }
    return {
      role: "You are a helpful AI assistant.",
      ...config,
    };
  }

  /**
   * Get the specific channel configuration.
   *
   * @param channel The name of the channel.
   * @throws When the channel configuration is not found.
   * @returns The channel configuration.
   */
  getChannelConfig(channel = "") {
    const config = this.channels.get(channel);
    if (!config) {
      throw new Error(`Channel configuration "${channel}" not found`);
    }
    return {
      maxRounds: 10,
      role: "",
      ...config,
    };
  }

  /**
   * Get the members of a group.
   * @throws When the group is not defined as an array in the connections.
   * @param node The name of the group.
   * @returns The members of the group.
   */
  getGroupMembers(node = "") {
    const group = this.getChannelConfig(node);
    return group.members;
  }

  /**
   * Triggered when a plugin, socket, or command is aborted.
   *
   * @param listener
   * @returns
   */
  onAbort(listener = () => null) {
    this.emitter.on("abort", listener);
    return this;
  }

  /**
   * Abort the running of any plugins that may still be pending (Langchain summarize)
   */
  abort() {
    this.emitter.emit("abort", null, this);
  }

  /**
   * Triggered when a chat is terminated. After this, the chat can't be continued.
   *
   * @param listener
   * @returns
   */
  onTerminate(listener = () => null) {
    this.emitter.on("terminate", listener);
    return this;
  }

  /**
   * Terminate the chat. After this, the chat can't be continued.
   *
   * @param node Last node to chat with
   */
  terminate(node = "") {
    this.emitter.emit("terminate", node, this);
  }

  /**
   * Triggered when a chat is interrupted by a node.
   *
   * @param listener
   * @returns
   */
  onInterrupt(listener = () => null) {
    this.emitter.on("interrupt", listener);
    return this;
  }

  /**
   * Interruption the chat.
   *
   * @param route The nodes that participated in the interruption.
   * @returns
   */
  interrupt(route) {
    this._chats.push({
      ...route,
      state: "interrupt",
    });
    this.emitter.emit("interrupt", route, this);
  }

  /**
   * Triggered when a message is added to the chat history.
   * This can either be the first message or a reply to a message.
   *
   * @param listener
   * @returns
   */
  onMessage(listener = (chat) => null) {
    this.emitter.on("message", listener);
    return this;
  }

  /**
   * Register a new successful message in the chat history.
   * This will trigger the `onMessage` event.
   *
   * @param message
   */
  newMessage(message) {
    const chat = {
      ...message,
      state: "success",
    };

    this._chats.push(chat);
    this.emitter.emit("message", chat, this);
  }

  /**
   * Triggered when an error occurs during the chat.
   *
   * @param listener
   * @returns
   */
  onError(
    listener = (
      /**
       * The error that occurred.
       *
       * Native errors are:
       * - `APIError`
       * - `AuthorizationError`
       * - `UnknownError`
       * - `RateLimitError`
       * - `ServerError`
       */
      error = null,
      /**
       * The message when the error occurred.
       */
      {}
    ) => null
  ) {
    this.emitter.on("replyError", listener);
    return this;
  }

  /**
   * Register an error in the chat history.
   * This will trigger the `onError` event.
   *
   * @param route
   * @param error
   */
  newError(route, error) {
    const chat = {
      ...route,
      content: error instanceof Error ? error.message : String(error),
      state: "error",
    };
    this._chats.push(chat);
    this.emitter.emit("replyError", error, chat);
  }

  /**
   * Triggered when a chat is interrupted by a node.
   *
   * @param listener
   * @returns
   */
  onStart(listener = (chat, aibitat) => null) {
    this.emitter.on("start", listener);
    return this;
  }

  /**
   * Start a new chat.
   *
   * @param message The message to start the chat.
   */
  async start(message) {
    // register the message in the chat history
    this.newMessage(message);
    this.emitter.emit("start", message, this);

    // ask the node to reply
    await this.chat({
      to: message.from,
      from: message.to,
    });

    return this;
  }

  /**
   * Recursively chat between two nodes.
   *
   * @param route
   * @param keepAlive Whether to keep the chat alive.
   */
  async chat(route, keepAlive = true) {
    let reply = "";
    try {
      reply = await this.reply(route);
    } catch (error) {
      if (error instanceof APIError) {
        return this.newError({ from: route.from, to: route.to }, error);
      }
      throw error;
    }

    console.log(
      `[chat] reply received, terminateAfterReply=${this.terminateAfterReply}, reply preview: ${String(reply).slice(0, 60)}`
    );

    const shouldStop = this.terminateAfterReply;
    this.terminateAfterReply = false;

    // ── Stop FIRST — before any further LLM rounds ──────────────────
    if (shouldStop) {
      this.terminate(route.to); // ← this closes the websocket
      return;
    }

    if (
      reply === "TERMINATE" ||
      this.hasReachedMaximumRounds(route.from, route.to)
    ) {
      this.terminate(route.to);
      return;
    }

    const newChat = { to: route.from, from: route.to };

    if (
      reply === "INTERRUPT" ||
      (this.agents.get(route.to) && this.shouldAgentInterrupt(route.to))
    ) {
      this.interrupt(newChat);
      return;
    }

    if (keepAlive) {
      await this.chat(newChat, true);
    }
  }

  /**
   * Check if the agent should interrupt the chat based on its configuration.
   *
   * @param agent
   * @returns {boolean} Whether the agent should interrupt the chat.
   */
  shouldAgentInterrupt(agent = "") {
    const config = this.getAgentConfig(agent);
    return this.defaultInterrupt === "ALWAYS" || config.interrupt === "ALWAYS";
  }

  /**
   * Select the next node to chat with from a group. The node will be selected based on the history of chats.
   * It will select the node that has not reached the maximum number of rounds yet and has not chatted with the channel in the last round.
   * If it could not determine the next node, it will return a random node.
   *
   * @param channel The name of the group.
   * @returns The name of the node to chat with.
   */
  async selectNext(channel = "") {
    // get all members of the group
    const nodes = this.getGroupMembers(channel);
    const channelConfig = this.getChannelConfig(channel);

    // warn if the group is underpopulated
    if (nodes.length < 3) {
      console.warn(
        `- Group (${channel}) is underpopulated with ${nodes.length} agents. Direct communication would be more efficient.`
      );
    }

    // get the nodes that have not reached the maximum number of rounds
    const availableNodes = nodes.filter(
      (node) => !this.hasReachedMaximumRounds(channel, node)
    );

    // remove the last node that chatted with the channel, so it doesn't chat again
    const lastChat = this._chats.filter((c) => c.to === channel).at(-1);
    if (lastChat) {
      const index = availableNodes.indexOf(lastChat.from);
      if (index > -1) {
        availableNodes.splice(index, 1);
      }
    }

    if (!availableNodes.length) return;

    const provider = this.getProviderForConfig({
      // @ts-expect-error
      model: "gpt-4",
      ...this.defaultProvider,
      ...channelConfig,
    });
    const history = this.getHistory({ to: channel });

    // build the messages to send to the provider
    const messages = [
      {
        role: "system",
        content: channelConfig.role,
      },
      {
        role: "user",
        content: `You are in a role play game. The following roles are available:
${availableNodes
  .map((node) => `@${node}: ${this.getAgentConfig(node).role}`)
  .join("\n")}.

Read the following conversation.

CHAT HISTORY
${history.map((c) => `@${c.from}: ${c.content}`).join("\n")}

Then select the next role from that is going to speak next.
Only return the role.
`,
      },
    ];

    const { result } = await provider.complete(messages);
    const name = result?.replace(/^@/g, "");
    if (this.agents.get(name)) return name;

    return availableNodes[Math.floor(Math.random() * availableNodes.length)];
  }

  /**
   * Automatically fires follow-up-questions after any substantive response.
   * Returns the follow-up payload appended to the original content,
   * or just the original content if the plugin isn't available or fires an error.
   */
  async #appendFollowUpQuestions(content = "", byAgent = null) {
    if (
      !content ||
      content.startsWith("FOLLOW_UP") ||
      content.startsWith("TERMINATE") ||
      content.startsWith("INTERRUPT") ||
      content.startsWith("STUDY_ONBOARDING::") || // ← add
      content.startsWith("STUDY_PLAN_FORM::") || // ← add
      content.startsWith("ONBOARDING_COMPLETE::") ||
      content.length < 50
    ) {
      return content;
    }

    const followUpFn = this.functions.get("follow-up-questions");
    if (!followUpFn) return content;

    try {
      followUpFn.caller = byAgent || "agent";
      const followUpResult = await followUpFn.handler({
        topic_summary: content.slice(0, 300),
        subject: null,
      });

      if (followUpResult?.startsWith("FOLLOW_UP_QUESTIONS::")) {
        // Return as two messages separated by a sentinel
        return `${content}\n__SPLIT__\n${followUpResult}`;
      }
    } catch (e) {
      this.handlerProps?.log?.(
        `[follow-up-questions] Failed silently: ${e.message}`
      );
    }

    return content;
  }

  /**
   *
   * @param {string} pluginName this name of the plugin being called
   * @returns string of the plugin to be called compensating for children denoted by # in the string.
   */
  #parseFunctionName(pluginName = "") {
    if (!pluginName.includes("#") && !pluginName.startsWith("@@"))
      return pluginName;
    if (pluginName.startsWith("@@")) return pluginName.replace("@@", "");
    return pluginName.split("#")[1];
  }

  /**
   * Check if the chat has reached the maximum number of rounds.
   */
  hasReachedMaximumRounds(from = "", to = "") {
    return this.getHistory({ from, to }).length >= this.maxRounds;
  }

  /**
   * Get the chat history between two nodes or all chats to/from a node.
   *
   * @param route
   * @returns
   */
  getOrFormatNodeChatHistory(route) {
    if (this.channels.get(route.to)) {
      return [
        {
          role: "user",
          content: `You are in a whatsapp group. Read the following conversation and then reply.
Do not add introduction or conclusion to your reply because this will be a continuous conversation. Don't introduce yourself.

CHAT HISTORY
${this.getHistory({ to: route.to })
  .map((c) => `@${c.from}: ${c.content}`)
  .join("\n")}

@${route.from}:`,
        },
      ];
    }

    // This is normal chat between user<->agent
    return this.getHistory(route).map((c) => ({
      content: c.content,
      role: c.from === route.to ? "user" : "assistant",
    }));
  }

  /**
   * Ask the for the AI provider to generate a reply to the chat.
   * This will load the functions that the node can call and the chat history.
   * Then before calling the provider, it will check if the provider supports agent streaming.
   * If it does, it will call the provider asynchronously (streaming).
   * Otherwise, it will call the provider synchronously (non-streaming).
   *
   * @param route.to The node that sent the chat.
   * @param route.from The node that will reply to the chat.
   */
  async reply(route) {
    const fromConfig = this.getAgentConfig(route.from);
    const chatHistory = this.getOrFormatNodeChatHistory(route);
    const messages = [
      { content: fromConfig.role, role: "system" },
      ...chatHistory,
    ];

    const functions = fromConfig.functions
      ?.map((name) => this.functions.get(this.#parseFunctionName(name)))
      .filter((a) => !!a);

    const provider = this.getProviderForConfig({
      ...this.defaultProvider,
      ...fromConfig,
    });

    let content;
    if (provider.supportsAgentStreaming) {
      content = await this.handleAsyncExecution(
        provider,
        messages,
        functions,
        route.from
      );
    } else {
      content = await this.handleExecution(
        provider,
        messages,
        functions,
        route.from
      );
    }

    if (typeof content === "string" && content.includes("\n__SPLIT__\n")) {
      const [mainContent, followUpContent] = content.split("\n__SPLIT__\n");
      this.newMessage({ ...route, content: mainContent });
      this.newMessage({ ...route, content: followUpContent });
      return mainContent;
    }

    // Plugin set terminateAfterReply — emit to WebSocket but don't pollute _chats
    if (this.terminateAfterReply) {
      this.emitter.emit("message", { ...route, content, state: "success" });
      return content;
    }

    this.newMessage({ ...route, content });
    return content;
  }

  /**
   * Handle the async (streaming) execution of the provider
   * with tool calls.
   *
   * @param provider
   * @param messages
   * @param functions
   * @param byAgent
   *
   * @returns {Promise<string>}
   */
  async handleAsyncExecution(
    provider,
    messages = [],
    functions = [],
    byAgent = null
  ) {
    return this.#executeToolLoop(provider, messages, functions, byAgent, true);
  }

  /**
   * Handle the synchronous (non-streaming) execution of the provider
   * with tool calls.
   *
   * @param provider
   * @param messages
   * @param functions
   * @param byAgent
   *
   * @returns {Promise<string>}
   */
  async handleExecution(
    provider,
    messages = [],
    functions = [],
    byAgent = null
  ) {
    return this.#executeToolLoop(provider, messages, functions, byAgent, false);
  }

  async #executeToolLoop(provider, messages, functions, byAgent, streaming) {
    const toolCalls = new Map();
    let totalToolCalls = 0;
    let unknownToolCalls = 0;
    let currentMessages = messages;

    while (true) {
      const completion = streaming
        ? await provider.stream(currentMessages, functions, (type, data) => {
            this?.socket?.send(type, data);
          })
        : await provider.complete(currentMessages, functions);

      if (!completion.functionCall) {
        return await this.#appendFollowUpQuestions(
          completion?.textResponse,
          byAgent
        );
      }

      totalToolCalls += 1;
      const { name } = completion.functionCall;
      const isAvailable = functions.some((item) => item.name === name);
      const fn = isAvailable ? this.functions.get(name) : null;

      if (totalToolCalls > this.maxToolCalls) {
        return this.#toolError("TOOL_CALL_LIMIT_EXCEEDED", {
          limit: this.maxToolCalls,
        });
      }

      if (!fn) {
        unknownToolCalls += 1;
        const feedback = this.#toolError("UNKNOWN_TOOL", {
          tool: name,
          availableTools: functions.map((item) => item.name),
        });
        if (unknownToolCalls > this.maxUnknownToolRetries) return feedback;
        currentMessages = this.#appendToolResult(
          currentMessages,
          completion.functionCall,
          feedback
        );
        continue;
      }

      const callCount = (toolCalls.get(name) || 0) + 1;
      toolCalls.set(name, callCount);
      if (callCount > this.maxToolRepeats) {
        return this.#toolError("TOOL_REPEAT_LIMIT_EXCEEDED", {
          tool: name,
          limit: this.maxToolRepeats,
        });
      }

      const parsedArgs = this.#parseToolArguments(
        completion.functionCall.arguments
      );
      if (!parsedArgs.valid) {
        currentMessages = this.#appendToolResult(
          currentMessages,
          completion.functionCall,
          this.#toolError("INVALID_TOOL_ARGUMENTS", {
            tool: name,
            errors: parsedArgs.errors,
          })
        );
        continue;
      }

      const validation = fn.parameters
        ? validateJsonSchema(parsedArgs.value, fn.parameters)
        : { valid: true, errors: [] };
      if (!validation.valid) {
        currentMessages = this.#appendToolResult(
          currentMessages,
          completion.functionCall,
          this.#toolError("INVALID_TOOL_ARGUMENTS", {
            tool: name,
            errors: validation.errors,
          })
        );
        continue;
      }

      fn.caller = byAgent || "agent";
      if (provider?.verbose) {
        this?.introspect?.(
          `[debug]: ${fn.caller} is attempting to call \`${name}\` tool`
        );
      }
      this.handlerProps?.log?.(
        `[debug]: ${fn.caller} is attempting to call \`${name}\` tool ${JSON.stringify(parsedArgs.value, null, 2)}`
      );

      const result = await fn.handler(parsedArgs.value);
      Telemetry.sendTelemetry("agent_tool_call", { tool: name }, null, true);

      if (this.skipHandleExecution) {
        this.skipHandleExecution = false;
        this?.introspect?.(
          `The tool call has direct output enabled! The result will be returned directly to the chat without any further processing and no further tool calls will be run.`
        );
        this?.introspect?.(`Tool use completed.`);
        this.handlerProps?.log?.(
          `${fn.caller} tool call resulted in direct output! Returning raw result as string. NO MORE TOOL CALLS WILL BE EXECUTED.`
        );
        return result;
      }

      currentMessages = this.#appendToolResult(
        currentMessages,
        completion.functionCall,
        result
      );
    }
  }

  #appendToolResult(messages, functionCall, content) {
    return [
      ...messages,
      {
        name: functionCall.name,
        role: "function",
        content,
        originalFunctionCall: functionCall,
      },
    ];
  }

  #parseToolArguments(args) {
    if (typeof args !== "string") return { valid: true, value: args };
    try {
      return { valid: true, value: JSON.parse(args) };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: "$",
            keyword: "parse",
            message: `must be valid JSON: ${error.message}`,
          },
        ],
      };
    }
  }

  #toolError(code, details) {
    return JSON.stringify({
      ok: false,
      error: { code, details },
    });
  }

  /**
   * Continue the chat from the last interruption.
   *
   * @param feedback The feedback to the interruption if any.
   * @returns
   */
  async continue(feedback) {
    const lastChat = this._chats.at(-1);
    if (!lastChat || lastChat.state !== "interrupt") {
      throw new Error("No chat to continue");
    }

    this._chats.pop();

    const { from, to } = lastChat;

    if (this.hasReachedMaximumRounds(from, to)) {
      throw new Error("Maximum rounds reached");
    }

    if (feedback) {
      const message = {
        from,
        to,
        content: feedback,
      };

      this.newMessage(message);

      await this.chat({
        to: message.from,
        from: message.to,
      });
    } else {
      await this.chat({ from, to });
    }

    return this;
  }

  /**
   * Retry the last chat that threw an error.
   */
  async retry() {
    const lastChat = this._chats.at(-1);
    if (!lastChat || lastChat.state !== "error") {
      throw new Error("No chat to retry");
    }

    const { from, to } = this?._chats?.pop();

    await this.chat({ from, to });
    return this;
  }

  /**
   * Get the chat history between two nodes or all chats to/from a node.
   */
  getHistory({ from, to }) {
    return this._chats.filter((chat) => {
      const isSuccess = chat.state === "success";

      if (!from) {
        return isSuccess && chat.to === to;
      }

      if (!to) {
        return isSuccess && chat.from === from;
      }

      const hasSent = chat.from === from && chat.to === to;
      const hasReceived = chat.from === to && chat.to === from;
      const mutual = hasSent || hasReceived;

      return isSuccess && mutual;
    });
  }

  /**
   * Get provider based on configurations.
   * If the provider is a string, it will return the default provider for that string.
   *
   * @param config The provider configuration.
   */
  getProviderForConfig(config) {
    if (typeof config.provider === "object") {
      return config.provider;
    }

    switch (config.provider) {
      case "openai":
        return new Providers.OpenAIProvider({ model: config.model });
      case "anthropic":
        return new Providers.AnthropicProvider({ model: config.model });
      case "lmstudio":
        return new Providers.LMStudioProvider({ model: config.model });
      case "ollama":
        return new Providers.OllamaProvider({ model: config.model });
      case "groq":
        return new Providers.GroqProvider({ model: config.model });
      case "togetherai":
        return new Providers.TogetherAIProvider({ model: config.model });
      case "azure":
        return new Providers.AzureOpenAiProvider({ model: config.model });
      case "koboldcpp":
        return new Providers.KoboldCPPProvider({});
      case "localai":
        return new Providers.LocalAIProvider({ model: config.model });
      case "openrouter":
        return new Providers.OpenRouterProvider({ model: config.model });
      case "mistral":
        return new Providers.MistralProvider({ model: config.model });
      case "generic-openai":
        return new Providers.GenericOpenAiProvider({ model: config.model });
      case "perplexity":
        return new Providers.PerplexityProvider({ model: config.model });
      case "textgenwebui":
        return new Providers.TextWebGenUiProvider({});
      case "bedrock":
        return new Providers.AWSBedrockProvider({});
      case "fireworksai":
        return new Providers.FireworksAIProvider({ model: config.model });
      case "nvidia-nim":
        return new Providers.NvidiaNimProvider({ model: config.model });
      case "moonshotai":
        return new Providers.MoonshotAiProvider({ model: config.model });
      case "deepseek":
        return new Providers.DeepSeekProvider({ model: config.model });
      case "litellm":
        return new Providers.LiteLLMProvider({ model: config.model });
      case "apipie":
        return new Providers.ApiPieProvider({ model: config.model });
      case "xai":
        return new Providers.XAIProvider({ model: config.model });
      case "novita":
        return new Providers.NovitaProvider({ model: config.model });
      case "ppio":
        return new Providers.PPIOProvider({ model: config.model });
      case "gemini":
        return new Providers.GeminiProvider({ model: config.model });
      case "dpais":
        return new Providers.DellProAiStudioProvider({ model: config.model });
      case "cometapi":
        return new Providers.CometApiProvider({ model: config.model });
      case "foundry":
        return new Providers.FoundryProvider({ model: config.model });
      default:
        throw new Error(
          `Unknown provider: ${config.provider}. Please use a valid provider.`
        );
    }
  }

  /**
   * Register a new function to be called by the AIbitat agents.
   * @param functionConfig The function configuration.
   */
  function(functionConfig) {
    this.functions.set(functionConfig.name, functionConfig);
    return this;
  }
}

module.exports = AIbitat;
