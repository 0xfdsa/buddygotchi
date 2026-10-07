import AppKit
import BoopKit
import CoreGraphics

/// The Mac's raw signals for the presence detector: the screen locking and unlocking, switching to another user and
/// back, the Mac or its displays sleeping and waking, and the idle time.
/// None of them asks for a permission. It says what happened, never what
/// it means: the detector decides.
final class PresenceSignals {
    var tokens: [(NotificationCenter, NSObjectProtocol)] = []

    /// Seconds since the last key press or mouse move, in ms: a number,
    /// never the events themselves.
    static let idleMs: @Sendable () -> Int64 = {
        let any = CGEventType(rawValue: ~0)!
        return Int64(CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: any) * 1000)
    }

    /// Hands each signal to `send`, on the main thread, until `stop`.
    func start(_ send: @escaping @Sendable (PresenceDetector.Signal) -> Void) {
        stop()
        let workspace = NSWorkspace.shared.notificationCenter
        let distributed = DistributedNotificationCenter.default()
        let watch: [(NotificationCenter, Notification.Name, PresenceDetector.Signal)] = [
            (distributed, Notification.Name("com.apple.screenIsLocked"), .locked),
            (distributed, Notification.Name("com.apple.screenIsUnlocked"), .unlocked),
            (workspace, NSWorkspace.sessionDidResignActiveNotification, .locked),
            (workspace, NSWorkspace.sessionDidBecomeActiveNotification, .unlocked),
            (workspace, NSWorkspace.willSleepNotification, .asleep),
            (workspace, NSWorkspace.screensDidSleepNotification, .asleep),
            (workspace, NSWorkspace.didWakeNotification, .woke),
            (workspace, NSWorkspace.screensDidWakeNotification, .woke),
        ]
        tokens = watch.map { center, name, signal in
            (center, center.addObserver(forName: name, object: nil, queue: .main) { _ in send(signal) })
        }
    }

    func stop() {
        for (center, token) in tokens { center.removeObserver(token) }
        tokens = []
    }
}
