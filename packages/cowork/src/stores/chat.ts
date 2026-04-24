import { createSignal } from "solid-js";
import {
  listConversations,
  createConversation as createConversationApi,
  deleteConversation as deleteConversationApi,
  getMessages,
  Conversation,
  Message,
} from "../lib/tauri-api";

export type { Message } from "../lib/tauri-api";

const [conversations, setConversations] = createSignal<Conversation[]>([]);
const [activeConversationId, setActiveConversationId] = createSignal<string | null>(null);
const [messages, setMessages] = createSignal<Message[]>([]);
const [isLoading, setIsLoading] = createSignal(false);

export async function loadConversations() {
  try {
    const convs = await listConversations();
    setConversations(convs);
  } catch (e) {
    console.error("Failed to load conversations:", e);
  }
}

export async function loadMessages(conversationId: string) {
  try {
    const msgs = await getMessages(conversationId);
    setMessages(msgs);
  } catch (e) {
    console.error("Failed to load messages:", e);
  }
}

export function useChat() {
  const activeConversation = () => {
    const id = activeConversationId();
    return id ? conversations().find((c) => c.id === id) : null;
  };

  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    await loadMessages(id);
  };

  const createConversation = async () => {
    try {
      const conversation = await createConversationApi("New Chat");
      setConversations((prev) => [conversation, ...prev]);
      setActiveConversationId(conversation.id);
      setMessages([]);
      return conversation;
    } catch (e) {
      console.error("Failed to create conversation:", e);
      return null;
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await deleteConversationApi(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId() === id) {
        const remaining = conversations().filter((c) => c.id !== id);
        if (remaining.length > 0) {
          await selectConversation(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (e) {
      console.error("Failed to delete conversation:", e);
    }
  };

  const addLocalMessage = (role: "user" | "assistant", content: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      conversation_id: activeConversationId() || "",
      role,
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  const updateLastMessage = (content: string) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m))
    );
  };

  const refreshConversations = async () => {
    await loadConversations();
  };

  return {
    conversations,
    activeConversation,
    activeConversationId,
    messages,
    selectConversation,
    createConversation,
    deleteConversation,
    addLocalMessage,
    updateLastMessage,
    refreshConversations,
    isLoading,
    setIsLoading,
    loadConversations,
  };
}
