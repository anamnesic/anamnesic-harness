import type { kairosConfig } from "../config/types.kairos.js";
import type { PluginRuntime } from "./runtime/types.js";
import type { kairosPluginApi, PluginLogger } from "./types.js";

export type BuildPluginApiParams = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  source: string;
  rootDir?: string;
  registrationMode: kairosPluginApi["registrationMode"];
  config: kairosConfig;
  pluginConfig?: Record<string, unknown>;
  runtime: PluginRuntime;
  logger: PluginLogger;
  resolvePath: (input: string) => string;
  handlers?: Partial<
    Pick<
      kairosPluginApi,
      | "registerTool"
      | "registerHook"
      | "registerHttpRoute"
      | "registerChannel"
      | "registerGatewayMethod"
      | "registerCli"
      | "registerReload"
      | "registerNodeHostCommand"
      | "registerNodeInvokePolicy"
      | "registerSecurityAuditCollector"
      | "registerService"
      | "registerGatewayDiscoveryService"
      | "registerCliBackend"
      | "registerTextTransforms"
      | "registerConfigMigration"
      | "registerMigrationProvider"
      | "registerAutoEnableProbe"
      | "registerProvider"
      | "registerSpeechProvider"
      | "registerRealtimeTranscriptionProvider"
      | "registerRealtimeVoiceProvider"
      | "registerMediaUnderstandingProvider"
      | "registerImageGenerationProvider"
      | "registerVideoGenerationProvider"
      | "registerMusicGenerationProvider"
      | "registerWebFetchProvider"
      | "registerWebSearchProvider"
      | "registerInteractiveHandler"
      | "onConversationBindingResolved"
      | "registerCommand"
      | "registerContextEngine"
      | "registerCompactionProvider"
      | "registerAgentHarness"
      | "registerCodexAppServerExtensionFactory"
      | "registerAgentToolResultMiddleware"
      | "registerSessionExtension"
      | "enqueueNextTurnInjection"
      | "registerTrustedToolPolicy"
      | "registerToolMetadata"
      | "registerControlUiDescriptor"
      | "registerRuntimeLifecycle"
      | "registerAgentEventSubscription"
      | "setRunContext"
      | "getRunContext"
      | "clearRunContext"
      | "registerSessionSchedulerJob"
      | "registerDetachedTaskRuntime"
      | "registerMemoryCapability"
      | "registerMemoryPromptSection"
      | "registerMemoryPromptSupplement"
      | "registerMemoryCorpusSupplement"
      | "registerMemoryFlushPlan"
      | "registerMemoryRuntime"
      | "registerMemoryEmbeddingProvider"
      | "on"
    >
  >;
};

const noopRegisterTool: kairosPluginApi["registerTool"] = () => {};
const noopRegisterHook: kairosPluginApi["registerHook"] = () => {};
const noopRegisterHttpRoute: kairosPluginApi["registerHttpRoute"] = () => {};
const noopRegisterChannel: kairosPluginApi["registerChannel"] = () => {};
const noopRegisterGatewayMethod: kairosPluginApi["registerGatewayMethod"] = () => {};
const noopRegisterCli: kairosPluginApi["registerCli"] = () => {};
const noopRegisterReload: kairosPluginApi["registerReload"] = () => {};
const noopRegisterNodeHostCommand: kairosPluginApi["registerNodeHostCommand"] = () => {};
const noopRegisterNodeInvokePolicy: kairosPluginApi["registerNodeInvokePolicy"] = () => {};
const noopRegisterSecurityAuditCollector: kairosPluginApi["registerSecurityAuditCollector"] =
  () => {};
const noopRegisterService: kairosPluginApi["registerService"] = () => {};
const noopRegisterGatewayDiscoveryService: kairosPluginApi["registerGatewayDiscoveryService"] =
  () => {};
const noopRegisterCliBackend: kairosPluginApi["registerCliBackend"] = () => {};
const noopRegisterTextTransforms: kairosPluginApi["registerTextTransforms"] = () => {};
const noopRegisterConfigMigration: kairosPluginApi["registerConfigMigration"] = () => {};
const noopRegisterMigrationProvider: kairosPluginApi["registerMigrationProvider"] = () => {};
const noopRegisterAutoEnableProbe: kairosPluginApi["registerAutoEnableProbe"] = () => {};
const noopRegisterProvider: kairosPluginApi["registerProvider"] = () => {};
const noopRegisterSpeechProvider: kairosPluginApi["registerSpeechProvider"] = () => {};
const noopRegisterRealtimeTranscriptionProvider: kairosPluginApi["registerRealtimeTranscriptionProvider"] =
  () => {};
const noopRegisterRealtimeVoiceProvider: kairosPluginApi["registerRealtimeVoiceProvider"] =
  () => {};
const noopRegisterMediaUnderstandingProvider: kairosPluginApi["registerMediaUnderstandingProvider"] =
  () => {};
const noopRegisterImageGenerationProvider: kairosPluginApi["registerImageGenerationProvider"] =
  () => {};
const noopRegisterVideoGenerationProvider: kairosPluginApi["registerVideoGenerationProvider"] =
  () => {};
const noopRegisterMusicGenerationProvider: kairosPluginApi["registerMusicGenerationProvider"] =
  () => {};
const noopRegisterWebFetchProvider: kairosPluginApi["registerWebFetchProvider"] = () => {};
const noopRegisterWebSearchProvider: kairosPluginApi["registerWebSearchProvider"] = () => {};
const noopRegisterInteractiveHandler: kairosPluginApi["registerInteractiveHandler"] = () => {};
const noopOnConversationBindingResolved: kairosPluginApi["onConversationBindingResolved"] =
  () => {};
const noopRegisterCommand: kairosPluginApi["registerCommand"] = () => {};
const noopRegisterContextEngine: kairosPluginApi["registerContextEngine"] = () => {};
const noopRegisterCompactionProvider: kairosPluginApi["registerCompactionProvider"] = () => {};
const noopRegisterAgentHarness: kairosPluginApi["registerAgentHarness"] = () => {};
const noopRegisterCodexAppServerExtensionFactory: kairosPluginApi["registerCodexAppServerExtensionFactory"] =
  () => {};
const noopRegisterAgentToolResultMiddleware: kairosPluginApi["registerAgentToolResultMiddleware"] =
  () => {};
const noopRegisterSessionExtension: kairosPluginApi["registerSessionExtension"] = () => {};
const noopEnqueueNextTurnInjection: kairosPluginApi["enqueueNextTurnInjection"] = async (
  injection,
) => ({ enqueued: false, id: "", sessionKey: injection.sessionKey });
const noopRegisterTrustedToolPolicy: kairosPluginApi["registerTrustedToolPolicy"] = () => {};
const noopRegisterToolMetadata: kairosPluginApi["registerToolMetadata"] = () => {};
const noopRegisterControlUiDescriptor: kairosPluginApi["registerControlUiDescriptor"] = () => {};
const noopRegisterRuntimeLifecycle: kairosPluginApi["registerRuntimeLifecycle"] = () => {};
const noopRegisterAgentEventSubscription: kairosPluginApi["registerAgentEventSubscription"] =
  () => {};
const noopSetRunContext: kairosPluginApi["setRunContext"] = () => false;
const noopGetRunContext: kairosPluginApi["getRunContext"] = () => undefined;
const noopClearRunContext: kairosPluginApi["clearRunContext"] = () => {};
const noopRegisterSessionSchedulerJob: kairosPluginApi["registerSessionSchedulerJob"] = () =>
  undefined;
const noopRegisterDetachedTaskRuntime: kairosPluginApi["registerDetachedTaskRuntime"] = () => {};
const noopRegisterMemoryCapability: kairosPluginApi["registerMemoryCapability"] = () => {};
const noopRegisterMemoryPromptSection: kairosPluginApi["registerMemoryPromptSection"] = () => {};
const noopRegisterMemoryPromptSupplement: kairosPluginApi["registerMemoryPromptSupplement"] =
  () => {};
const noopRegisterMemoryCorpusSupplement: kairosPluginApi["registerMemoryCorpusSupplement"] =
  () => {};
const noopRegisterMemoryFlushPlan: kairosPluginApi["registerMemoryFlushPlan"] = () => {};
const noopRegisterMemoryRuntime: kairosPluginApi["registerMemoryRuntime"] = () => {};
const noopRegisterMemoryEmbeddingProvider: kairosPluginApi["registerMemoryEmbeddingProvider"] =
  () => {};
const noopOn: kairosPluginApi["on"] = () => {};

export function buildPluginApi(params: BuildPluginApiParams): kairosPluginApi {
  const handlers = params.handlers ?? {};
  return {
    id: params.id,
    name: params.name,
    version: params.version,
    description: params.description,
    source: params.source,
    rootDir: params.rootDir,
    registrationMode: params.registrationMode,
    config: params.config,
    pluginConfig: params.pluginConfig,
    runtime: params.runtime,
    logger: params.logger,
    registerTool: handlers.registerTool ?? noopRegisterTool,
    registerHook: handlers.registerHook ?? noopRegisterHook,
    registerHttpRoute: handlers.registerHttpRoute ?? noopRegisterHttpRoute,
    registerChannel: handlers.registerChannel ?? noopRegisterChannel,
    registerGatewayMethod: handlers.registerGatewayMethod ?? noopRegisterGatewayMethod,
    registerCli: handlers.registerCli ?? noopRegisterCli,
    registerReload: handlers.registerReload ?? noopRegisterReload,
    registerNodeHostCommand: handlers.registerNodeHostCommand ?? noopRegisterNodeHostCommand,
    registerNodeInvokePolicy: handlers.registerNodeInvokePolicy ?? noopRegisterNodeInvokePolicy,
    registerSecurityAuditCollector:
      handlers.registerSecurityAuditCollector ?? noopRegisterSecurityAuditCollector,
    registerService: handlers.registerService ?? noopRegisterService,
    registerGatewayDiscoveryService:
      handlers.registerGatewayDiscoveryService ?? noopRegisterGatewayDiscoveryService,
    registerCliBackend: handlers.registerCliBackend ?? noopRegisterCliBackend,
    registerTextTransforms: handlers.registerTextTransforms ?? noopRegisterTextTransforms,
    registerConfigMigration: handlers.registerConfigMigration ?? noopRegisterConfigMigration,
    registerMigrationProvider: handlers.registerMigrationProvider ?? noopRegisterMigrationProvider,
    registerAutoEnableProbe: handlers.registerAutoEnableProbe ?? noopRegisterAutoEnableProbe,
    registerProvider: handlers.registerProvider ?? noopRegisterProvider,
    registerSpeechProvider: handlers.registerSpeechProvider ?? noopRegisterSpeechProvider,
    registerRealtimeTranscriptionProvider:
      handlers.registerRealtimeTranscriptionProvider ?? noopRegisterRealtimeTranscriptionProvider,
    registerRealtimeVoiceProvider:
      handlers.registerRealtimeVoiceProvider ?? noopRegisterRealtimeVoiceProvider,
    registerMediaUnderstandingProvider:
      handlers.registerMediaUnderstandingProvider ?? noopRegisterMediaUnderstandingProvider,
    registerImageGenerationProvider:
      handlers.registerImageGenerationProvider ?? noopRegisterImageGenerationProvider,
    registerVideoGenerationProvider:
      handlers.registerVideoGenerationProvider ?? noopRegisterVideoGenerationProvider,
    registerMusicGenerationProvider:
      handlers.registerMusicGenerationProvider ?? noopRegisterMusicGenerationProvider,
    registerWebFetchProvider: handlers.registerWebFetchProvider ?? noopRegisterWebFetchProvider,
    registerWebSearchProvider: handlers.registerWebSearchProvider ?? noopRegisterWebSearchProvider,
    registerInteractiveHandler:
      handlers.registerInteractiveHandler ?? noopRegisterInteractiveHandler,
    onConversationBindingResolved:
      handlers.onConversationBindingResolved ?? noopOnConversationBindingResolved,
    registerCommand: handlers.registerCommand ?? noopRegisterCommand,
    registerContextEngine: handlers.registerContextEngine ?? noopRegisterContextEngine,
    registerCompactionProvider:
      handlers.registerCompactionProvider ?? noopRegisterCompactionProvider,
    registerAgentHarness: handlers.registerAgentHarness ?? noopRegisterAgentHarness,
    registerCodexAppServerExtensionFactory:
      handlers.registerCodexAppServerExtensionFactory ?? noopRegisterCodexAppServerExtensionFactory,
    registerAgentToolResultMiddleware:
      handlers.registerAgentToolResultMiddleware ?? noopRegisterAgentToolResultMiddleware,
    registerSessionExtension: handlers.registerSessionExtension ?? noopRegisterSessionExtension,
    enqueueNextTurnInjection: handlers.enqueueNextTurnInjection ?? noopEnqueueNextTurnInjection,
    registerTrustedToolPolicy: handlers.registerTrustedToolPolicy ?? noopRegisterTrustedToolPolicy,
    registerToolMetadata: handlers.registerToolMetadata ?? noopRegisterToolMetadata,
    registerControlUiDescriptor:
      handlers.registerControlUiDescriptor ?? noopRegisterControlUiDescriptor,
    registerRuntimeLifecycle: handlers.registerRuntimeLifecycle ?? noopRegisterRuntimeLifecycle,
    registerAgentEventSubscription:
      handlers.registerAgentEventSubscription ?? noopRegisterAgentEventSubscription,
    setRunContext: handlers.setRunContext ?? noopSetRunContext,
    getRunContext: handlers.getRunContext ?? noopGetRunContext,
    clearRunContext: handlers.clearRunContext ?? noopClearRunContext,
    registerSessionSchedulerJob:
      handlers.registerSessionSchedulerJob ?? noopRegisterSessionSchedulerJob,
    registerDetachedTaskRuntime:
      handlers.registerDetachedTaskRuntime ?? noopRegisterDetachedTaskRuntime,
    registerMemoryCapability: handlers.registerMemoryCapability ?? noopRegisterMemoryCapability,
    registerMemoryPromptSection:
      handlers.registerMemoryPromptSection ?? noopRegisterMemoryPromptSection,
    registerMemoryPromptSupplement:
      handlers.registerMemoryPromptSupplement ?? noopRegisterMemoryPromptSupplement,
    registerMemoryCorpusSupplement:
      handlers.registerMemoryCorpusSupplement ?? noopRegisterMemoryCorpusSupplement,
    registerMemoryFlushPlan: handlers.registerMemoryFlushPlan ?? noopRegisterMemoryFlushPlan,
    registerMemoryRuntime: handlers.registerMemoryRuntime ?? noopRegisterMemoryRuntime,
    registerMemoryEmbeddingProvider:
      handlers.registerMemoryEmbeddingProvider ?? noopRegisterMemoryEmbeddingProvider,
    resolvePath: params.resolvePath,
    on: handlers.on ?? noopOn,
  };
}
