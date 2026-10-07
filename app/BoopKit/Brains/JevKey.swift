import Foundation

/// Jev's key: `BOOP_JEV_KEY`, else, in the menu-bar app
/// only, the Keychain.
public enum JevKey {
    /// The only place `boopdev` and `Boop --headless` read it from.
    public static let variable = "BOOP_JEV_KEY"

    public static func environment() -> String? {
        ProcessInfo.processInfo.environment[variable].flatMap { $0.isEmpty ? nil : $0 }
    }
}
