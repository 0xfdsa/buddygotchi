import Foundation

/// `boop.log`, the app's log in the state directory.
/// The app writes it; this only keeps it from growing without end.
public enum BoopLog {
    /// A log past this at launch moves to `boop.1.log`.
    public static let maxBytes: UInt64 = 5 << 20

    /// At launch, before the log is opened: moves `boop.log` past
    /// `maxBytes` to `boop.1.log`, replacing the one there, so the launch
    /// starts a new one. Only while holding the folder's instance lock,
    /// which it lets go again for the runtime: a second copy started on a
    /// running app's folder mustn't move the log that app is writing to.
    /// Returns whether it moved it.
    @discardableResult
    public static func rotate(in directory: URL) -> Bool {
        let fm = FileManager.default
        let url = directory.appendingPathComponent("boop.log")
        guard let size = (try? fm.attributesOfItem(atPath: url.path))?[.size] as? UInt64, size > maxBytes,
              let lock = InstanceLock(directory: directory) else { return false }
        return withExtendedLifetime(lock) {
            let kept = directory.appendingPathComponent("boop.1.log")
            try? fm.removeItem(at: kept)
            return (try? fm.moveItem(at: url, to: kept)) != nil
        }
    }
}
