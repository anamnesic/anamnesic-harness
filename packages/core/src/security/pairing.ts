import type { SessionManager } from "../sessions"
import type { ChannelGateway } from "../channels"
import { randomUUID } from "crypto"

export interface PairingRequest {
  id: string
  userId: string
  channelId: string
  timestamp: number
  expiresAt: number
  approved?: boolean
}

export interface PairingCode {
  code: string
  requestId: string
  expiresAt: number
}

export class PairingManager {
  private requests: Map<string, PairingRequest> = new Map()
  private codes: Map<string, PairingCode> = new Map()
  private sessions: SessionManager
  private channels: ChannelGateway
  private listeners: Set<(request: PairingRequest) => void> = new Set()

  constructor(sessions: SessionManager, channels: ChannelGateway) {
    this.sessions = sessions
    this.channels = channels
  }

  async initiatePairing(
    userId: string,
    channelId: string,
  ): Promise<PairingCode> {
    const requestId = randomUUID()
    const code = this.generateCode()

    const request: PairingRequest = {
      id: requestId,
      userId,
      channelId,
      timestamp: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    }

    this.requests.set(requestId, request)

    const pairingCode: PairingCode = {
      code,
      requestId,
      expiresAt: request.expiresAt,
    }

    this.codes.set(code, pairingCode)
    this.notifyListeners(request)

    return pairingCode
  }

  async approvePairing(code: string): Promise<boolean> {
    const pairingCode = this.codes.get(code)
    if (!pairingCode || pairingCode.expiresAt < Date.now()) {
      return false
    }

    const request = this.requests.get(pairingCode.requestId)
    if (!request) {
      return false
    }

    request.approved = true
    this.requests.set(pairingCode.requestId, request)

    this.codes.delete(code)

    return true
  }

  isPaired(userId: string, channelId: string): boolean {
    for (const request of this.requests.values()) {
      if (
        request.userId === userId &&
        request.channelId === channelId &&
        request.approved
      ) {
        return true
      }
    }
    return false
  }

  onPairingRequest(listener: (request: PairingRequest) => void): void {
    this.listeners.add(listener)
  }

  private generateCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  private notifyListeners(request: PairingRequest): void {
    this.listeners.forEach((listener) => {
      try {
        listener(request)
      } catch {
        // Listener error
      }
    })
  }
}
