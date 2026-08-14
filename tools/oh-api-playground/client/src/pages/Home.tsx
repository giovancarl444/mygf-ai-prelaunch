/** Console Atelier reminder: build a clear rail-to-stage API instrument; orange means action and purple means selection or identity. */
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  ArrowUpRight,
  AudioLines,
  Bot,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  Code2,
  Contact,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  Menu,
  MessageCircle,
  Mic2,
  Play,
  Plus,
  Radio,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Video,
  Volume2,
  WandSparkles,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const BASE_URL = "https://api.oh.xyz";
const API_KEY_STORAGE = "oh-api-playground-key";

type TabId = "chat" | "image" | "video" | "audio" | "cam";
type VideoMode = "text" | "image";

type Character = {
  character_id: string;
  name?: string;
  age?: number | string;
  occupation?: string;
  profile_image_url?: string;
  type?: "ORIGINAL" | "DIGITAL_TWIN" | string;
};

type Message = { id: string; role: "user" | "character"; content: string };
type Diagnostic = { endpoint: string; title: string; detail: string };
type AsyncStatus = { phase: "idle" | "submitting" | "polling" | "completed" | "failed"; label: string; endpoint?: string };
type CamResult = { sessionId?: string; avatarUrl?: string; authToken?: string };

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "APIs", icon: Code2 },
  { label: "Documentation", icon: FileText },
  { label: "Playground", icon: Play },
  { label: "Characters", icon: Contact },
  { label: "Usage Analytics", icon: Activity },
  { label: "Pricing", icon: CreditCard },
  { label: "Payments", icon: WalletIcon },
  { label: "Account", icon: Settings },
  { label: "Contact", icon: MessageCircle },
];

const tabs: { id: TabId; label: string; icon: typeof MessageCircle; endpoint: string }[] = [
  { id: "chat", label: "Chat", icon: MessageCircle, endpoint: "/api/v1/rooms → /api/v1/text" },
  { id: "image", label: "Image", icon: ImageIcon, endpoint: "/api/v1/images" },
  { id: "video", label: "Video", icon: Video, endpoint: "/api/v1/videos/create" },
  { id: "audio", label: "Audio", icon: AudioLines, endpoint: "/api/v1/audio/notes" },
  { id: "cam", label: "Cam", icon: Camera, endpoint: "/api/v1/cam/create" },
];

function WalletIcon({ className }: { className?: string }) {
  return <CreditCard className={className} />;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown, keys: string[]): string | undefined {
  const source = record(value);
  for (const key of keys) {
    if (typeof source[key] === "string" && source[key]) return source[key] as string;
  }
  for (const containerKey of ["data", "result", "response"]) {
    const nested = source[containerKey];
    if (nested && typeof nested === "object") {
      const found = readString(nested, keys);
      if (found) return found;
    }
  }
  return undefined;
}

function responseText(value: unknown): string {
  const result = readString(value, ["reply", "response", "message", "text", "content", "output"]);
  return result ?? JSON.stringify(value, null, 2);
}

function extractResultUrl(value: unknown): string | undefined {
  return readString(value, ["presigned_url", "url", "result_url", "media_url", "output_url"]);
}

function extractCharacters(value: unknown): Character[] {
  const source = record(value);
  const candidate = Array.isArray(value)
    ? value
    : [source.characters, source.data, source.results, source.items].find(Array.isArray);

  if (!candidate) return [];

  return candidate
    .map((item) => {
      const itemRecord = record(item);
      const characterId = readString(item, ["character_id", "characterId", "id"]);
      return characterId
        ? {
            character_id: characterId,
            name: readString(item, ["name", "display_name", "character_name"]),
            age: itemRecord.age as number | string | undefined,
            occupation: readString(item, ["occupation", "job", "profession"]),
            profile_image_url: readString(item, ["profile_image_url", "profileImageUrl", "image_url", "image"]),
            type: readString(item, ["type", "character_type"]),
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

async function apiRequest<T>(path: string, apiKey: string, init?: RequestInit): Promise<T> {
  if (!apiKey.trim()) throw new Error("Add an API key before sending a request.");

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey.trim(),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const raw = await response.text();
  let payload: unknown = raw;
  try { payload = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON errors are still surfaced below */ }

  if (!response.ok) {
    const payloadRecord = record(payload);
    const summary = readString(payload, ["error", "message", "detail"]) ?? `Request failed with HTTP ${response.status}.`;
    const diagnosticBody = typeof payload === "string" ? payload : JSON.stringify(payloadRecord, null, 2);
    throw new Error(`${summary}\n${diagnosticBody}`.trim());
  }

  return payload as T;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function PanelHeader({ title, endpoint, aside }: { title: string; endpoint?: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3 border-b border-[#704079]/30 pb-4">
      <div>
        <div className="flex items-center gap-3"><p className="signal-label">Live endpoint</p><span className="mono border-l border-[#713f76]/45 pl-3 text-[9px] tracking-[0.13em] text-[#8e6c94]">PANEL / 01</span></div>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#fff3fb]">{title}</h2>
        {endpoint && <p className="mono mt-1.5 text-[11px] text-[#a88aaf]">{endpoint}</p>}
      </div>
      {aside}
    </div>
  );
}

function CharacterCard({ character, selected, onClick }: { character: Character; selected: boolean; onClick: () => void }) {
  const displayName = character.name ?? "Unnamed character";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 overflow-hidden border p-3 text-left transition duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fc7a1d] ${
        selected
          ? "border-[#fc7a1d]/75 border-l-[3px] border-l-[#fc7a1d] bg-[#301527] shadow-[0_10px_28px_rgba(252,122,29,0.09)]"
          : "border-[#6e4275]/35 bg-[#170919] hover:border-[#a85aac]/55 hover:bg-[#1d0b20]"
      }`}
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[#c273ca]/30 bg-[#2a1230]">
        {character.profile_image_url ? (
          <img src={character.profile_image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#dc9ee0]"><Bot size={20} /></div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#f8eafa]">{displayName}{character.age ? `, ${character.age}` : ""}</p>
        <p className="mt-0.5 truncate text-xs text-[#a88aaf]">{character.occupation ?? "No occupation supplied"}</p>
      </div>
      <span className={`mono shrink-0 text-[9px] tracking-[0.08em] ${character.type === "DIGITAL_TWIN" ? "text-[#e3a0ff]" : "text-[#ffb477]"}`}>
        {character.type === "DIGITAL_TWIN" ? "TWIN" : "ORIGINAL"}
      </span>
      {selected && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#fc7a1d]" />}
    </button>
  );
}

function ResultPlaceholder({ image, eyebrow, title, description }: { image: string; eyebrow: string; title: string; description: string }) {
  return (
    <div className="relative min-h-[360px] overflow-hidden border border-[#734478]/35 bg-[#110113]">
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#110113] via-[#110113]/55 to-[#110113]/15" />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <p className="signal-label">{eyebrow}</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.045em] text-white">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#dac5de]">{description}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [rooms, setRooms] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageResult, setImageResult] = useState<string | null>(null);
  const [videoMode, setVideoMode] = useState<VideoMode>("text");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoImageUrl, setVideoImageUrl] = useState("");
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const [audioText, setAudioText] = useState("");
  const [audioResult, setAudioResult] = useState<string | null>(null);
  const [camWebhookUrl, setCamWebhookUrl] = useState("");
  const [camResult, setCamResult] = useState<CamResult | null>(null);
  const [asyncStatus, setAsyncStatus] = useState<AsyncStatus>({ phase: "idle", label: "Ready" });

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.character_id === selectedCharacterId) ?? null,
    [characters, selectedCharacterId],
  );
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  useEffect(() => {
    const storedKey = window.localStorage.getItem(API_KEY_STORAGE) ?? "";
    setApiKey(storedKey);
    setApiKeyDraft(storedKey);
  }, []);

  useEffect(() => {
    if (apiKey) void loadCharacters(apiKey);
    // A saved key intentionally reconnects the browser-local workspace on load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  function showError(endpoint: string, title: string, error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    setDiagnostic({ endpoint, title, detail });
    setAsyncStatus({ phase: "failed", label: "Request failed", endpoint });
  }

  async function loadCharacters(key = apiKey) {
    const endpoint = "/api/v1/characters";
    setIsLoadingCharacters(true);
    setDiagnostic(null);
    try {
      const payload = await apiRequest<unknown>(endpoint, key);
      const availableCharacters = extractCharacters(payload);
      setCharacters(availableCharacters);
      setSelectedCharacterId((current) => current ?? availableCharacters[0]?.character_id ?? null);
      if (!availableCharacters.length) {
        setDiagnostic({ endpoint, title: "No characters returned", detail: "The API key was accepted, but this request did not return any character records." });
      }
    } catch (error) {
      showError(endpoint, "Could not load characters", error);
      setCharacters([]);
      setSelectedCharacterId(null);
    } finally {
      setIsLoadingCharacters(false);
    }
  }

  function connectKey(event: FormEvent) {
    event.preventDefault();
    const trimmedKey = apiKeyDraft.trim();
    if (!trimmedKey) {
      setDiagnostic({ endpoint: "Authentication", title: "API key required", detail: "Paste an Oh API key to load the character library and send requests." });
      return;
    }
    window.localStorage.setItem(API_KEY_STORAGE, trimmedKey);
    setApiKey(trimmedKey);
    toast.success("Key saved in this browser", { description: "The key is never sent to this app’s server." });
  }

  function clearKey() {
    window.localStorage.removeItem(API_KEY_STORAGE);
    setApiKey("");
    setApiKeyDraft("");
    setCharacters([]);
    setSelectedCharacterId(null);
    setMessages([]);
    setRooms({});
    toast.message("Browser-local API key removed");
  }

  function requireCharacter(endpoint: string): Character | null {
    if (selectedCharacter) return selectedCharacter;
    setDiagnostic({ endpoint, title: "Choose a character", detail: "Select a character from the library before sending this request." });
    return null;
  }

  async function pollJob(jobId: string, endpoint: string): Promise<unknown> {
    const timeoutAt = Date.now() + 5 * 60 * 1000;
    while (Date.now() < timeoutAt) {
      await wait(2000);
      const payload = await apiRequest<unknown>(`/api/v1/jobs/${jobId}/status`, apiKey);
      const status = (readString(payload, ["status", "state"]) ?? "processing").toLowerCase();
      const result = extractResultUrl(payload);
      setAsyncStatus({ phase: "polling", label: status === "queued" ? "Queued by Oh API" : "Generating output", endpoint });
      if (status === "completed" || status === "complete" || status === "succeeded" || result) return payload;
      if (status === "failed" || status === "error" || status === "cancelled") {
        throw new Error(readString(payload, ["error", "message", "detail"]) ?? `The job entered ${status} state.`);
      }
    }
    throw new Error("Polling stopped after 5 minutes. Check the job status endpoint for the final state.");
  }

  async function createRoom(characterId: string) {
    const endpoint = "/api/v1/rooms";
    const payload = await apiRequest<unknown>(endpoint, apiKey, { method: "POST", body: JSON.stringify({ character_id: characterId }) });
    const roomId = readString(payload, ["room_id", "roomId", "id"]);
    if (!roomId) throw new Error("The create-room response did not contain a room_id.");
    setRooms((current) => ({ ...current, [characterId]: roomId }));
    return roomId;
  }

  async function sendChat(event: FormEvent) {
    event.preventDefault();
    const character = requireCharacter("/api/v1/text");
    const message = chatInput.trim();
    if (!character || !message || isSendingChat) return;

    const pendingMessage: Message = { id: `${Date.now()}-user`, role: "user", content: message };
    setMessages((current) => [...current, pendingMessage]);
    setChatInput("");
    setIsSendingChat(true);
    setDiagnostic(null);
    try {
      const roomId = rooms[character.character_id] ?? (await createRoom(character.character_id));
      const payload = await apiRequest<unknown>("/api/v1/text", apiKey, {
        method: "POST",
        body: JSON.stringify({ room_id: roomId, character_id: character.character_id, message }),
      });
      setMessages((current) => [...current, { id: `${Date.now()}-character`, role: "character", content: responseText(payload) }]);
    } catch (error) {
      setMessages((current) => current.filter((item) => item.id !== pendingMessage.id));
      showError("/api/v1/rooms → /api/v1/text", "Chat request failed", error);
    } finally {
      setIsSendingChat(false);
    }
  }

  async function generateImage() {
    const endpoint = "/api/v1/images";
    const character = requireCharacter(endpoint);
    if (!character || !imagePrompt.trim() || asyncStatus.phase === "submitting" || asyncStatus.phase === "polling") return;
    setImageResult(null);
    setDiagnostic(null);
    setAsyncStatus({ phase: "submitting", label: "Submitting image job", endpoint });
    try {
      const payload = await apiRequest<unknown>(endpoint, apiKey, { method: "POST", body: JSON.stringify({ character_id: character.character_id, prompt: imagePrompt.trim() }) });
      const immediateUrl = extractResultUrl(payload);
      const jobId = readString(payload, ["job_id", "jobId", "id"]);
      const completed = jobId ? await pollJob(jobId, endpoint) : payload;
      const url = extractResultUrl(completed) ?? immediateUrl;
      if (!url) throw new Error("The completed image job did not include a presigned output URL.");
      setImageResult(url);
      setAsyncStatus({ phase: "completed", label: "Image ready", endpoint });
    } catch (error) { showError(endpoint, "Image generation failed", error); }
  }

  async function generateVideo() {
    const endpoint = "/api/v1/videos/create";
    const prompt = videoPrompt.trim();
    const character = videoMode === "text" ? requireCharacter(endpoint) : null;
    if (!prompt || (videoMode === "text" && !character) || (videoMode === "image" && !videoImageUrl.trim())) return;
    setVideoResult(null);
    setDiagnostic(null);
    setAsyncStatus({ phase: "submitting", label: "Submitting video job", endpoint });
    try {
      const body = videoMode === "text"
        ? { character_id: character?.character_id, prompt }
        : { image_url: videoImageUrl.trim(), prompt };
      const payload = await apiRequest<unknown>(endpoint, apiKey, { method: "POST", body: JSON.stringify(body) });
      const immediateUrl = extractResultUrl(payload);
      const jobId = readString(payload, ["job_id", "jobId", "id"]);
      const completed = jobId ? await pollJob(jobId, endpoint) : payload;
      const url = extractResultUrl(completed) ?? immediateUrl;
      if (!url) throw new Error("The completed video job did not include a playable output URL.");
      setVideoResult(url);
      setAsyncStatus({ phase: "completed", label: "Video ready", endpoint });
    } catch (error) { showError(endpoint, "Video generation failed", error); }
  }

  async function generateAudio() {
    const endpoint = "/api/v1/audio/notes";
    const character = requireCharacter(endpoint);
    if (!character || !audioText.trim()) return;
    setAudioResult(null);
    setDiagnostic(null);
    setAsyncStatus({ phase: "submitting", label: "Submitting audio job", endpoint });
    try {
      const payload = await apiRequest<unknown>(endpoint, apiKey, { method: "POST", body: JSON.stringify({ character_id: character.character_id, text: audioText.trim() }) });
      const immediateUrl = extractResultUrl(payload);
      const jobId = readString(payload, ["job_id", "jobId", "id"]);
      const completed = jobId ? await pollJob(jobId, endpoint) : payload;
      const url = extractResultUrl(completed) ?? immediateUrl;
      if (!url) throw new Error("The completed audio job did not include a playable output URL.");
      setAudioResult(url);
      setAsyncStatus({ phase: "completed", label: "Audio ready", endpoint });
    } catch (error) { showError(endpoint, "Audio generation failed", error); }
  }

  async function createCamSession() {
    const endpoint = "/api/v1/cam/create";
    const character = requireCharacter(endpoint);
    if (!character || !camWebhookUrl.trim()) return;
    setCamResult(null);
    setDiagnostic(null);
    setAsyncStatus({ phase: "submitting", label: "Creating Cam session", endpoint });
    try {
      const payload = await apiRequest<unknown>(endpoint, apiKey, {
        method: "POST",
        body: JSON.stringify({ characterId: character.character_id, restEndpointUrl: camWebhookUrl.trim(), apiKey }),
      });
      setCamResult({
        sessionId: readString(payload, ["session_id", "sessionId", "id"]),
        avatarUrl: readString(payload, ["avatar_url", "avatarUrl", "url"]),
        authToken: readString(payload, ["auth_token", "authToken", "token"]),
      });
      setAsyncStatus({ phase: "completed", label: "Cam session created", endpoint });
    } catch (error) { showError(endpoint, "Cam session failed", error); }
  }

  async function copyText(text: string, label: string) {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); }
    catch { toast.error("Clipboard unavailable", { description: "Copy the value manually from the panel." }); }
  }

  const busy = asyncStatus.phase === "submitting" || asyncStatus.phase === "polling";

  return (
    <div className="atelier-grid min-h-screen bg-[#0f0a10] text-[#f8eafa] md:flex">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[244px] flex-col overflow-y-auto border-r border-[#733d76]/50 bg-[#1a0d1c]/95 px-4 py-5 shadow-[18px_0_48px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-transform duration-200 md:sticky md:top-0 md:h-screen md:shrink-0 md:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <img src="/manus-storage/oh-aperture-mark_ecdd2455.png" alt="Oh API Playground" className="h-10 w-10 object-contain" />
            <div>
              <p className="text-[15px] font-bold tracking-[-0.04em] text-white">OH / PLAYGROUND</p>
              <p className="mono mt-0.5 text-[9px] tracking-[0.13em] text-[#a88aaf]">DIRECT REQUEST STUDIO</p>
            </div>
          </div>
          <button type="button" className="p-1 text-[#cfaed4] md:hidden" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>

        <nav className="mt-9 space-y-1" aria-label="Application navigation">
          {navItems.map(({ label, icon: Icon }) => {
            const active = label === "Playground";
            return (
              <button key={label} type="button" onClick={() => active ? undefined : toast.message(`${label} is not included in this playground build yet.`)} className={`flex w-full items-center gap-3 border px-3 py-2.5 text-left text-sm transition ${active ? "border-[#fc7a1d]/45 bg-[#3a1a21] text-[#fff0e8]" : "border-transparent text-[#b99abb] hover:border-[#7d4580]/30 hover:bg-[#251027] hover:text-white"}`}>
                <Icon size={16} className={active ? "text-[#fc7a1d]" : "text-[#b58abb]"} />
                <span className="flex-1">{label}</span>
                {active && <span className="h-1.5 w-1.5 bg-[#fc7a1d] shadow-[0_0_10px_rgba(252,122,29,0.75)]" />}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#783f7d]/30 px-2 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#913cdd] text-xs font-bold text-white">OH</div>
            <div className="min-w-0"><p className="text-xs font-medium text-[#e7d6e9]">Browser-local key</p><p className="mono truncate text-[10px] text-[#967a9b]">{apiKey ? "connection staged" : "awaiting key"}</p></div>
          </div>
        </div>
      </aside>

      {mobileNavOpen && <button aria-label="Close navigation overlay" type="button" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-black/65 md:hidden" />}

      <main className="min-h-screen min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[#703c76]/30 bg-[#0f0a10]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setMobileNavOpen(true)} className="border border-[#6f4174]/50 p-2 text-[#d9bfdc] md:hidden" aria-label="Open navigation"><Menu size={18} /></button>
              <div>
                <p className="signal-label">Request laboratory</p>
                <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-[#f9edfa]">Playground / <span className="text-[#a681ad]">multimodal endpoints</span></p>
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex"><ShieldCheck size={15} className="text-[#fc7a1d]" /><span className="mono text-[10px] tracking-[0.06em] text-[#b999bd]">KEYS REMAIN IN THIS BROWSER</span></div>
          </div>
        </header>

        <section className="relative overflow-hidden border-b border-[#703c76]/30 px-4 py-7 sm:px-6 lg:px-8">
          <img src="/manus-storage/oh-console-surface_c1b3ac05.jpg" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0f0a10] via-[#0f0a10]/90 to-[#1b0a1d]/45" />
          <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <p className="signal-label">Oh API / Direct control</p>
              <h1 className="mt-3 max-w-xl text-3xl font-bold leading-[0.98] tracking-[-0.065em] text-[#fff5fd] sm:text-4xl">Choose a character.<br /><span className="text-[#fca367]">Observe the response.</span></h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#d0b8d3]">Test character, media, and session endpoints from one browser-native workspace. Results are fetched directly from Oh API with your own key.</p>
            </div>
            <div className="atelier-panel max-w-lg p-4 xl:w-[470px]">
              <form onSubmit={connectKey} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block min-w-0 flex-1"><span className="mono mb-2 block text-[10px] uppercase tracking-[0.12em] text-[#b898bd]">Your API key</span><div className="relative"><KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#d28ed5]" /><input value={apiKeyDraft} onChange={(event) => setApiKeyDraft(event.target.value)} type={showKey ? "text" : "password"} placeholder="Paste your X-API-Key" className="mono h-10 w-full border border-[#734477]/55 bg-[#0f0811]/85 pl-9 pr-10 text-xs text-white placeholder:text-[#775f7b] focus:border-[#fc7a1d]/90 focus:outline-none" autoComplete="off" /><button type="button" onClick={() => setShowKey((current) => !current)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#b999bc] hover:text-white" aria-label={showKey ? "Hide API key" : "Reveal API key"}>{showKey ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></label>
                <div className="flex gap-2"><Button type="submit" className="h-10 rounded-none bg-[#fc7a1d] px-4 text-xs font-bold text-[#260c0d] hover:bg-[#ff9140] active:scale-[0.97]">{isLoadingCharacters ? <Loader2 size={15} className="animate-spin" /> : "Connect"}</Button>{apiKey && <Button type="button" onClick={clearKey} variant="outline" className="h-10 rounded-none border-[#75457a] bg-[#150617] px-3 text-[#dcbde0] hover:bg-[#2d1030] hover:text-white"><X size={15} /></Button>}</div>
              </form>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#a78bac]"><LockKeyhole size={12} className="text-[#fc7a1d]" /> Saved only to local storage on this device. Remove it anytime.</p>
            </div>
          </div>
        </section>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as TabId); setDiagnostic(null); }} className="w-full">
            <div className="mb-6 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <TabsList className="grid h-auto w-full grid-cols-5 rounded-none border border-[#6f3c72]/40 bg-[#160718] p-1 sm:w-[580px]">
                {tabs.map(({ id, label, icon: Icon }) => <TabsTrigger key={id} value={id} className="flex min-h-10 items-center gap-1.5 rounded-none px-2 text-xs text-[#b493b8] data-[state=active]:bg-[#913cdd] data-[state=active]:text-white sm:px-3"><Icon size={14} /> <span className="hidden sm:inline">{label}</span></TabsTrigger>)}
              </TabsList>
              <div className="flex items-center gap-2 self-start lg:self-auto"><span className={`h-2 w-2 rounded-full ${apiKey ? "bg-[#fc7a1d] shadow-[0_0_12px_rgba(252,122,29,0.7)]" : "bg-[#725378]"}`} /><span className="mono text-[10px] uppercase tracking-[0.1em] text-[#a789ad]">{apiKey ? "API key staged" : "connection inactive"}</span></div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
              <section className="atelier-panel p-4 sm:p-5">
                <PanelHeader title="Character library" endpoint="GET /api/v1/characters" aside={<button type="button" onClick={() => void loadCharacters()} disabled={!apiKey || isLoadingCharacters} className="border border-[#8f4b92]/45 p-2 text-[#d6b0da] transition hover:border-[#fc7a1d] hover:text-[#fc7a1d] disabled:opacity-35" aria-label="Reload characters">{isLoadingCharacters ? <Loader2 size={15} className="animate-spin" /> : <Radio size={15} />}</button>} />
                {!apiKey ? <div className="border border-dashed border-[#704074]/50 bg-[#120514] p-5 text-center"><KeyRound className="mx-auto text-[#d991d9]" size={22} /><p className="mt-3 text-sm font-medium text-[#f4e2f6]">Stage a key to browse</p><p className="mt-1.5 text-xs leading-5 text-[#a387a8]">Character records are loaded only after your browser submits a valid API key.</p></div> : isLoadingCharacters ? <div className="flex min-h-[230px] flex-col items-center justify-center text-[#cb9ace]"><Loader2 className="animate-spin" /><p className="mono mt-3 text-[10px] uppercase tracking-[0.13em]">Loading library</p></div> : <div className="scrollbar-thin max-h-[430px] space-y-2 overflow-y-auto pr-1">{characters.map((character) => <CharacterCard key={character.character_id} character={character} selected={character.character_id === selectedCharacterId} onClick={() => { setSelectedCharacterId(character.character_id); setMessages([]); }} />)}{!characters.length && <div className="border border-dashed border-[#704074]/50 p-5 text-center text-xs leading-5 text-[#a387a8]">No records available from this key yet.</div>}</div>}
              </section>

              <section className="atelier-panel atelier-panel-primary min-w-0 p-4 sm:p-6">
                <PanelHeader title={currentTab.label === "Cam" ? "Interactive session" : `${currentTab.label} workspace`} endpoint={currentTab.endpoint} aside={<div className="hidden items-center gap-2 text-right sm:flex"><span className="mono text-[9px] uppercase tracking-[0.12em] text-[#9d7ba3]">Mode</span><span className="border border-[#913cdd]/40 bg-[#28102c] px-2 py-1 mono text-[10px] text-[#e8b7ff]">{currentTab.label}</span></div>} />

                {activeTab === "chat" && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="flex min-h-[500px] flex-col overflow-hidden border border-[#713f76]/40 bg-[#110113]">
                    <div className="flex items-center gap-3 border-b border-[#713f76]/35 bg-[#18071a] p-4"><div className="h-9 w-9 overflow-hidden rounded-full border border-[#a26aa7]/50 bg-[#311534]">{selectedCharacter?.profile_image_url ? <img src={selectedCharacter.profile_image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#dca4e1]"><Bot size={17} /></div>}</div><div><p className="text-sm font-semibold text-white">{selectedCharacter?.name ?? "Select a character"}</p><p className="mono mt-0.5 text-[10px] text-[#ad8bb1]">{selectedCharacter ? "room opens on first message" : "library selection required"}</p></div><span className="ml-auto h-2 w-2 rounded-full bg-[#fc7a1d] shadow-[0_0_12px_rgba(252,122,29,.7)]" /></div>
                    <div className="scrollbar-thin flex flex-1 flex-col gap-4 overflow-y-auto p-4">{messages.length ? messages.map((message) => <div key={message.id} className={`max-w-[88%] border px-3 py-2.5 text-sm leading-6 ${message.role === "user" ? "ml-auto border-[#fc7a1d]/50 bg-[#4b211c] text-[#fff1e8]" : "border-[#7c4b82]/45 bg-[#241026] text-[#ebd8ed]"}`}><p className="mono mb-1 text-[9px] uppercase tracking-[0.12em] text-[#c897cc]">{message.role === "user" ? "You" : selectedCharacter?.name ?? "Character"}</p>{message.content}</div>) : <div className="m-auto max-w-sm text-center"><MessageCircle className="mx-auto text-[#913cdd]" size={30} /><h3 className="mt-4 text-lg font-semibold text-white">Start an observable conversation</h3><p className="mt-2 text-sm leading-6 text-[#af91b3]">Choose a character, then send a message. The room is created once and reused for the active conversation.</p></div>}{isSendingChat && <div className="flex items-center gap-2 text-xs text-[#dea4e3]"><Loader2 className="animate-spin" size={14} /> Receiving response</div>}</div>
                    <form onSubmit={sendChat} className="border-t border-[#713f76]/35 bg-[#18071a] p-3"><div className="flex gap-2"><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} disabled={!apiKey || !selectedCharacter || isSendingChat} placeholder={selectedCharacter ? `Message ${selectedCharacter.name ?? "character"}` : "Choose a character first"} className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white placeholder:text-[#785e7c] focus:outline-none" /><Button type="submit" disabled={!apiKey || !selectedCharacter || !chatInput.trim() || isSendingChat} className="h-9 rounded-none bg-[#fc7a1d] px-3 text-[#29100c] hover:bg-[#ff9140] disabled:opacity-35"><Send size={16} /></Button></div></form>
                  </div>
                  <ResultPlaceholder image="/manus-storage/oh-chat-portal_997dd003.jpg" eyebrow="Character channel" title={selectedCharacter ? `Ready for ${selectedCharacter.name ?? "conversation"}` : "An identity waits"} description={selectedCharacter ? "This conversation maintains the current room context until you select another character." : "Choose a record from the library to open its live chat channel."} />
                </div>}

                {activeTab === "image" && <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]"><div className="space-y-5"><div><label className="signal-label">Prompt</label><textarea value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} placeholder="Describe the image you want to request…" className="mt-3 min-h-40 w-full resize-y border border-[#724076]/55 bg-[#100512] p-4 text-sm leading-6 text-white placeholder:text-[#785c7e] focus:border-[#fc7a1d] focus:outline-none" /></div><Button type="button" onClick={() => void generateImage()} disabled={!apiKey || !selectedCharacter || !imagePrompt.trim() || busy} className="h-11 w-full rounded-none bg-[#fc7a1d] text-sm font-bold text-[#2b100a] hover:bg-[#ff9140] disabled:opacity-40">{busy ? <><Loader2 size={16} className="animate-spin" /> {asyncStatus.label}</> : <><WandSparkles size={16} /> Generate image</>}</Button><p className="text-xs leading-5 text-[#a58aa9]">Uses the selected character and polls the job state every two seconds for up to five minutes.</p></div><div>{imageResult ? <div className="overflow-hidden border border-[#7b4b82]/45 bg-[#110113]"><img src={imageResult} alt="Generated by the active Oh API image job" className="max-h-[570px] w-full object-contain" /><div className="flex items-center justify-between gap-3 p-3"><span className="mono text-[10px] text-[#b597b9]">PRESIGNED RESULT</span><a href={imageResult} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-[#ffad71] hover:text-[#ffd3b4]">Open <ArrowUpRight size={14} /></a></div></div> : <ResultPlaceholder image="/manus-storage/oh-image-viewport_10092f6d.jpg" eyebrow="Output viewport" title="A result will resolve here" description="Submit a prompt to receive an asynchronous job. The completed presigned asset will appear in this panel." />}</div></div>}

                {activeTab === "video" && <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]"><div className="space-y-5"><div className="grid grid-cols-2 border border-[#703c75]/50 bg-[#120414] p-1"><button type="button" onClick={() => setVideoMode("text")} className={`px-3 py-2 text-xs font-semibold ${videoMode === "text" ? "bg-[#913cdd] text-white" : "text-[#b493b9]"}`}>Text to Video</button><button type="button" onClick={() => setVideoMode("image")} className={`px-3 py-2 text-xs font-semibold ${videoMode === "image" ? "bg-[#913cdd] text-white" : "text-[#b493b9]"}`}>Image to Video</button></div>{videoMode === "image" && <label className="block"><span className="signal-label">Source image URL</span><input value={videoImageUrl} onChange={(event) => setVideoImageUrl(event.target.value)} placeholder="https://…" className="mono mt-3 h-11 w-full border border-[#724076]/55 bg-[#100512] px-3 text-xs text-white placeholder:text-[#785c7e] focus:border-[#fc7a1d] focus:outline-none" /></label>}<label className="block"><span className="signal-label">Video direction</span><textarea value={videoPrompt} onChange={(event) => setVideoPrompt(event.target.value)} placeholder="Describe the requested motion and scene…" className="mt-3 min-h-32 w-full resize-y border border-[#724076]/55 bg-[#100512] p-4 text-sm leading-6 text-white placeholder:text-[#785c7e] focus:border-[#fc7a1d] focus:outline-none" /></label><Button type="button" onClick={() => void generateVideo()} disabled={!apiKey || !videoPrompt.trim() || busy || (videoMode === "text" && !selectedCharacter) || (videoMode === "image" && !videoImageUrl.trim())} className="h-11 w-full rounded-none bg-[#fc7a1d] text-sm font-bold text-[#2b100a] hover:bg-[#ff9140] disabled:opacity-40">{busy ? <><Loader2 size={16} className="animate-spin" /> {asyncStatus.label}</> : <><Video size={16} /> Generate video</>}</Button></div><div>{videoResult ? <div className="overflow-hidden border border-[#7b4b82]/45 bg-black"><video controls src={videoResult} className="aspect-video w-full" /><div className="flex items-center justify-between gap-3 bg-[#110113] p-3"><span className="mono text-[10px] text-[#b597b9]">PRESIGNED VIDEO</span><a href={videoResult} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-[#ffad71] hover:text-[#ffd3b4]">Open <ArrowUpRight size={14} /></a></div></div> : <ResultPlaceholder image="/manus-storage/oh-console-surface_c1b3ac05.jpg" eyebrow="Motion viewport" title="Video results appear here" description="Choose text-to-video with a character or image-to-video with a source URL, then inspect the completed asset in place." />}</div></div>}

                {activeTab === "audio" && <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]"><div className="space-y-5"><label className="block"><span className="signal-label">What should the character say?</span><textarea value={audioText} onChange={(event) => setAudioText(event.target.value)} placeholder="Enter the spoken line…" className="mt-3 min-h-40 w-full resize-y border border-[#724076]/55 bg-[#100512] p-4 text-sm leading-6 text-white placeholder:text-[#785c7e] focus:border-[#fc7a1d] focus:outline-none" /></label><Button type="button" onClick={() => void generateAudio()} disabled={!apiKey || !selectedCharacter || !audioText.trim() || busy} className="h-11 w-full rounded-none bg-[#fc7a1d] text-sm font-bold text-[#2b100a] hover:bg-[#ff9140] disabled:opacity-40">{busy ? <><Loader2 size={16} className="animate-spin" /> {asyncStatus.label}</> : <><Mic2 size={16} /> Generate audio</>}</Button><p className="text-xs leading-5 text-[#a58aa9]">The current documentation lists <span className="mono">/api/v1/audio/notes</span> for audio note generation.</p></div><div>{audioResult ? <div className="flex min-h-[360px] flex-col justify-center border border-[#7b4b82]/45 bg-[#110113] p-8"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#fc7a1d]/55 bg-[#3b1a22] text-[#fc7a1d]"><Volume2 size={32} /></div><p className="mt-6 text-center text-lg font-semibold text-white">Audio output ready</p><audio controls src={audioResult} className="mt-5 w-full" /><a href={audioResult} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-center gap-1 text-xs font-semibold text-[#ffad71] hover:text-[#ffd3b4]">Open presigned audio <ArrowUpRight size={14} /></a></div> : <ResultPlaceholder image="/manus-storage/oh-waveform-artifact_e31a837d.jpg" eyebrow="Voice artifact" title="Sound will materialize here" description="Send a selected character and spoken line to create an audio job, then play the completed asset directly in this workspace." />}</div></div>}

                {activeTab === "cam" && <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]"><div className="space-y-5"><label className="block"><span className="signal-label">Your webhook URL</span><input value={camWebhookUrl} onChange={(event) => setCamWebhookUrl(event.target.value)} type="url" placeholder="https://your-service.example/events" className="mono mt-3 h-11 w-full border border-[#724076]/55 bg-[#100512] px-3 text-xs text-white placeholder:text-[#785c7e] focus:border-[#fc7a1d] focus:outline-none" /></label><Button type="button" onClick={() => void createCamSession()} disabled={!apiKey || !selectedCharacter || !camWebhookUrl.trim() || busy} className="h-11 w-full rounded-none bg-[#fc7a1d] text-sm font-bold text-[#2b100a] hover:bg-[#ff9140] disabled:opacity-40">{busy ? <><Loader2 size={16} className="animate-spin" /> {asyncStatus.label}</> : <><Camera size={16} /> Create Cam session</>}</Button><div className="border border-[#734176]/45 bg-[#160718] p-4 text-xs leading-5 text-[#ab8daf]"><p className="mono text-[10px] uppercase tracking-[0.12em] text-[#e8b4ed]">Request contract</p><p className="mt-2">The session request includes the selected character ID, your event receiver URL, and the configured API key as described in the project brief.</p></div></div><div className="space-y-4">{camResult ? <div className="border border-[#7b4b82]/45 bg-[#110113] p-5"><p className="signal-label">Session ready</p><h3 className="mt-3 text-xl font-semibold text-white">Cam endpoint responded</h3><div className="mt-5 space-y-3"><CamField label="Session ID" value={camResult.sessionId} onCopy={copyText} /><CamField label="Avatar URL" value={camResult.avatarUrl} link onCopy={copyText} /><CamField label="Auth token" value={camResult.authToken} onCopy={copyText} /></div></div> : <ResultPlaceholder image="/manus-storage/oh-chat-portal_997dd003.jpg" eyebrow="Live session" title="Create a channel endpoint" description="A completed Cam session exposes its session ID, avatar URL, and token here alongside the webhook payload reference." />}<WebhookExamples onCopy={copyText} /></div></div>}

                {diagnostic && <div className="mt-6 border border-[#e16752]/55 bg-[#361216]/55 p-4"><div className="flex items-start gap-3"><CircleAlert className="mt-0.5 shrink-0 text-[#ff8e78]" size={18} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#ffe3de]">{diagnostic.title}</p><p className="mono mt-1 text-[10px] text-[#ffb5a5]">{diagnostic.endpoint}</p><pre className="scrollbar-thin mt-3 max-h-44 overflow-auto whitespace-pre-wrap border-l border-[#ff7c66]/45 pl-3 text-xs leading-5 text-[#f6c3ba]">{diagnostic.detail}</pre></div><button type="button" onClick={() => setDiagnostic(null)} className="p-1 text-[#ffa291] hover:text-white" aria-label="Dismiss diagnostic"><X size={16} /></button></div></div>}

                {asyncStatus.phase !== "idle" && asyncStatus.phase !== "failed" && <div className="mt-6 flex items-center gap-3 border border-[#874b8e]/40 bg-[#1d0c20] p-3"><span className={`h-1.5 w-12 bg-[#fc7a1d] ${busy ? "status-pulse" : ""}`} /><div><p className="text-xs font-semibold text-[#f7e6f9]">{asyncStatus.label}</p><p className="mono mt-0.5 text-[10px] text-[#a689aa]">{asyncStatus.endpoint}</p></div>{asyncStatus.phase === "completed" && <Check className="ml-auto text-[#fc7a1d]" size={18} />}</div>}
              </section>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function CamField({ label, value, link, onCopy }: { label: string; value?: string; link?: boolean; onCopy: (text: string, label: string) => void }) {
  return <div className="border border-[#6e3e73]/45 bg-[#18091a] p-3"><div className="mb-1 flex items-center justify-between gap-2"><span className="mono text-[10px] uppercase tracking-[0.11em] text-[#bd9dc1]">{label}</span>{value && <button type="button" onClick={() => void onCopy(value, label)} className="text-[#e7a3ea] hover:text-[#ffbe82]" aria-label={`Copy ${label}`}><Copy size={14} /></button>}</div>{value ? link ? <a href={value} target="_blank" rel="noreferrer" className="mono block truncate text-xs text-[#ffb477] hover:text-[#ffdabd]">{value}</a> : <code className="mono block break-all text-xs text-[#f4d5f6]">{value}</code> : <p className="text-xs text-[#987c9d]">Not returned in this response.</p>}</div>;
}

function WebhookExamples({ onCopy }: { onCopy: (text: string, label: string) => void }) {
  const examples = [
    ["LOGIN", '{\n  "event": "LOGIN",\n  "session_id": "<session_id>",\n  "timestamp": "<iso_timestamp>"\n}'],
    ["CHAT", '{\n  "event": "CHAT",\n  "session_id": "<session_id>",\n  "message": "<message>"\n}'],
    ["LOGOUT", '{\n  "event": "LOGOUT",\n  "session_id": "<session_id>",\n  "timestamp": "<iso_timestamp>"\n}'],
  ];
  return <div className="border border-[#6d3e73]/45 bg-[#160718] p-4"><div className="flex items-center justify-between"><p className="signal-label">Webhook payloads</p><Code2 size={15} className="text-[#d99bdd]" /></div><div className="mt-3 space-y-2">{examples.map(([label, example]) => <div key={label} className="border border-[#66396b]/40 bg-[#0f0611] p-3"><div className="flex items-center justify-between gap-2"><span className="mono text-[10px] text-[#ffad71]">{label}</span><button type="button" onClick={() => void onCopy(example, `${label} payload`)} className="text-[#cfa8d2] hover:text-white" aria-label={`Copy ${label} webhook example`}><Copy size={13} /></button></div><pre className="mono mt-2 overflow-x-auto text-[10px] leading-5 text-[#bc9cc0]">{example}</pre></div>)}</div></div>;
}
