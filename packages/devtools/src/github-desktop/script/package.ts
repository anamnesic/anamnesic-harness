/* eslint-disable no-sync */
/// <reference path="./globals.d.ts" />

import * as cp from 'child_process'
import debianInstaller from 'electron-installer-debian'
import * as path from 'path'
import * as electronInstaller from 'electron-winstaller'
import { author, description } from '../app/package.json'
import { getProductName, getCompanyName, getVersion } from '../app/package-info'
import {
  getDistPath,
  getOSXZipPath,
  getWindowsIdentifierName,
  getWindowsStandaloneName,
  getWindowsInstallerName,
  shouldMakeDelta,
  getUpdatesURL,
  isPublishable,
  getBundleSizes,
  getDistRoot,
  getDistArchitecture,
  getIconDirectory,
} from './dist-info'
import { isGitHubActions } from './build-platforms'
import { existsSync, rmSync, writeFileSync } from 'fs'
import { rename } from 'fs/promises'
import { join } from 'path'
import { assertNonNullable } from '../app/src/lib/fatal-error'

const distPath = getDistPath()
const productName = getProductName()
const outputDir = getDistRoot()
const linuxPackageName = 'github-desktop'
const linuxIconPath = path.resolve(
  __dirname,
  '../app/static/linux/icon-logo.png'
)

const assertExistsSync = (path: string) => {
  if (!existsSync(path)) {
    throw new Error(`Expected ${path} to exist`)
  }
}

async function main() {
  if (process.platform === 'darwin') {
    packageOSX()
  } else if (process.platform === 'win32') {
    await packageWindows()
  } else if (process.platform === 'linux') {
    await packageLinux()
  } else {
    throw new Error(`I don't know how to package for ${process.platform} :(`)
  }

  console.log('Writing bundle size info…')
  writeFileSync(
    path.join(getDistRoot(), 'bundle-size.json'),
    JSON.stringify(getBundleSizes())
  )
}

void main().catch(error => {
  console.error(`Error packaging: ${error}`)
  process.exit(1)
})

function packageOSX() {
  const dest = getOSXZipPath()
  rmSync(dest, { recursive: true, force: true })

  console.log('Packaging for macOS…')
  cp.execSync(
    `ditto -ck --keepParent "${distPath}/${productName}.app" "${dest}"`
  )
}

async function packageWindows() {
  const iconSource = join(getIconDirectory(), 'icon-logo.ico')

  if (!existsSync(iconSource)) {
    console.error(`expected setup icon not found at location: ${iconSource}`)
    process.exit(1)
  }

  const splashScreenPath = path.resolve(
    __dirname,
    '../app/static/logos/win32-installer-splash.gif'
  )

  if (!existsSync(splashScreenPath)) {
    console.error(
      `expected setup splash screen gif not found at location: ${splashScreenPath}`
    )
    process.exit(1)
  }

  const iconUrl = 'https://desktop.githubusercontent.com/app-icon.ico'

  const nugetPkgName = getWindowsIdentifierName()
  const options: electronInstaller.Options = {
    name: nugetPkgName,
    appDirectory: distPath,
    outputDirectory: outputDir,
    authors: getCompanyName(),
    iconUrl: iconUrl,
    setupIcon: iconSource,
    loadingGif: splashScreenPath,
    exe: `${nugetPkgName}.exe`,
    title: productName,
    setupExe: getWindowsStandaloneName(),
    setupMsi: getWindowsInstallerName(),
  }

  if (shouldMakeDelta()) {
    const url = new URL(getUpdatesURL())
    // Make sure Squirrel.Windows isn't affected by partially or completely
    // disabled releases.
    url.searchParams.set('bypassStaggeredRelease', '1')
    options.remoteReleases = url.toString()
  }

  if (isGitHubActions() && isPublishable()) {
    assertNonNullable(process.env.RUNNER_TEMP, 'Missing RUNNER_TEMP env var')

    const acsPath = join(process.env.RUNNER_TEMP, 'acs')
    const dlibPath = join(acsPath, 'bin', 'x64', 'Azure.CodeSigning.Dlib.dll')

    assertExistsSync(dlibPath)

    const metadataPath = join(acsPath, 'metadata.json')
    const acsMetadata = {
      Endpoint: 'https://wus3.codesigning.azure.net/',
      CodeSigningAccountName: 'GitHubInc',
      CertificateProfileName: 'GitHubInc',
      CorrelationId: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
    }
    writeFileSync(metadataPath, JSON.stringify(acsMetadata))

    options.signWithParams = `/v /fd SHA256 /tr "http://timestamp.acs.microsoft.com" /td SHA256 /dlib "${dlibPath}" /dmdf "${metadataPath}"`
  }

  console.log('Packaging for Windows…')
  await electronInstaller.createWindowsInstaller(options)
  console.log(`Installers created in ${outputDir}`)

  // electron-winstaller (more specifically Squirrel.Windows) doesn't let us
  // control the name of the nuget packages but we want them to include the
  // architecture similar to how the setup exe and msi do so we'll just have to
  // rename them here after the fact.
  const arch = getDistArchitecture()
  const prefix = `${getWindowsIdentifierName()}-${getVersion()}`

  for (const kind of shouldMakeDelta() ? ['full', 'delta'] : ['full']) {
    const from = join(outputDir, `${prefix}-${kind}.nupkg`)
    const to = join(outputDir, `${prefix}-${arch}-${kind}.nupkg`)

    console.log(`Renaming ${from} to ${to}`)
    await rename(from, to)
  }
}

async function packageLinux() {
  assertExistsSync(linuxIconPath)

  const packageFiles = await debianInstaller({
    src: distPath,
    dest: outputDir,
    arch: toDebianArchitecture(getDistArchitecture()),
    options: {
      name: linuxPackageName,
      productName,
      genericName: productName,
      description,
      productDescription: description,
      version: toDebianVersion(getVersion()),
      section: 'devel',
      priority: 'optional',
      maintainer: `${author.name} <${author.email}>`,
      homepage: author.url,
      bin: 'desktop',
      icon: linuxIconPath,
      categories: ['Development', 'RevisionControl'],
      mimeType: getLinuxProtocolMimeTypes(),
    },
  })

  const outputFiles = Array.isArray(packageFiles)
    ? packageFiles
    : [packageFiles]
  console.log(`Installers created in ${outputFiles.join(', ')}`)
}

function toDebianArchitecture(
  architecture: ReturnType<typeof getDistArchitecture>
) {
  return architecture === 'x64' ? 'amd64' : 'arm64'
}

function toDebianVersion(version: string) {
  return version.replace(/-/g, '~')
}

function getLinuxProtocolMimeTypes() {
  return ['x-github-client', getLinuxOAuthProtocol()].map(
    protocol => `x-scheme-handler/${protocol}`
  )
}

function getLinuxOAuthProtocol() {
  return process.env.NODE_ENV === 'development' ||
    !process.env.DESKTOP_OAUTH_CLIENT_SECRET
    ? 'x-github-desktop-dev-auth'
    : 'x-github-desktop-auth'
}
