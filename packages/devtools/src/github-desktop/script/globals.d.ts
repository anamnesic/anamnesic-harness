type Package = {
  productName?: string
  dependencies: Record<string, string>
  devDependencies?: Record<string, string>
}

declare namespace NodeJS {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Process extends EventEmitter {
    on(event: 'unhandledRejection', listener: (error: Error) => void): this
  }
}

declare module 'electron-installer-debian' {
  export type DebianArchitecture = 'amd64' | 'arm64'

  export interface IInstallerOptions {
    readonly src: string
    readonly dest: string
    readonly arch?: DebianArchitecture
    readonly options?: {
      readonly name?: string
      readonly productName?: string
      readonly genericName?: string
      readonly description?: string
      readonly productDescription?: string
      readonly version?: string
      readonly section?: string
      readonly priority?: string
      readonly maintainer?: string
      readonly homepage?: string
      readonly bin?: string
      readonly icon?: string
      readonly categories?: ReadonlyArray<string>
      readonly mimeType?: ReadonlyArray<string>
    }
  }

  export default function installer(
    options: IInstallerOptions
  ): Promise<string | ReadonlyArray<string>>
}
