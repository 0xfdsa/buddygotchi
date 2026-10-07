// swift-tools-version: 6.0
import PackageDescription

// LinkKit: a Mac app talking to a small device with a screen, over
// Bluetooth or a USB bridge (SPEC.md). Foundation and CoreBluetooth only,
// and nothing outside this folder: apps depend on it, never the other way
// round. The device's half, in C++, is in device/, which SwiftPM ignores.
let package = Package(
    name: "linkkit",
    platforms: [.macOS(.v13)],
    products: [
        .library(name: "LinkKit", targets: ["LinkKit"]),
        .executable(name: "linkkit-bridge", targets: ["LinkKitBridge"]),
    ],
    targets: [
        // The four messages, the transports, the USB bridge and the host's
        // side of the protocol (`DeviceLink`).
        .target(name: "LinkKit", linkerSettings: [.linkedFramework("CoreBluetooth")]),
        // `linkkit-bridge`: shares a board's USB serial port on a socket
        // (`Bridge`), for `SocketTransport`.
        .executableTarget(name: "LinkKitBridge", dependencies: ["LinkKit"]),
        .testTarget(name: "LinkKitTests", dependencies: ["LinkKit"]),
    ]
)
