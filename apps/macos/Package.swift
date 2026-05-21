// swift-tools-version: 6.2
// Package manifest for the kairos macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "kairos",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "kairosIPC", targets: ["kairosIPC"]),
        .library(name: "kairosDiscovery", targets: ["kairosDiscovery"]),
        .executable(name: "kairos", targets: ["kairos"]),
        .executable(name: "kairos-mac", targets: ["kairosMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.3.0"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.4.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.10.1"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.9.0"),
        .package(url: "https://github.com/steipete/Peekaboo.git", exact: "3.0.0-beta4"),
        .package(path: "../shared/kairosKit"),
        .package(path: "../../Swabble"),
    ],
    targets: [
        .target(
            name: "kairosIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "kairosDiscovery",
            dependencies: [
                .product(name: "kairosKit", package: "kairosKit"),
            ],
            path: "Sources/kairosDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "kairos",
            dependencies: [
                "kairosIPC",
                "kairosDiscovery",
                .product(name: "kairosKit", package: "kairosKit"),
                .product(name: "kairosChatUI", package: "kairosKit"),
                .product(name: "kairosProtocol", package: "kairosKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/kairos.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "kairosMacCLI",
            dependencies: [
                "kairosDiscovery",
                .product(name: "kairosKit", package: "kairosKit"),
                .product(name: "kairosProtocol", package: "kairosKit"),
            ],
            path: "Sources/kairosMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "kairosIPCTests",
            dependencies: [
                "kairosIPC",
                "kairos",
                "kairosDiscovery",
                .product(name: "kairosProtocol", package: "kairosKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
