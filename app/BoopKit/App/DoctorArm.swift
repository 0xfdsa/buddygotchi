import Foundation

/// The `doctor` skill's arm, which has the app log every
/// hook while it lasts.
extension Runtime {
    /// While this file exists in the state directory, every hook is logged.
    public static let doctorArm = "doctor-armed"
    /// How long an arm lasts: one the doctor never
    /// confirms is removed, so hooks aren't logged from then on.
    public static let doctorArmSeconds: TimeInterval = 10 * 60
    /// The doctor's arm (`doctorArm`), in the state directory.
    var doctorArmPath: String { options.stateDir.appendingPathComponent(Self.doctorArm).path }

    /// Whether the doctor armed this app within the last 10 minutes. An
    /// older arm is removed.
    func doctorArmed() -> Bool {
        guard let armed = (try? FileManager.default.attributesOfItem(atPath: doctorArmPath))?[.modificationDate] as? Date
        else { return false }
        if Date().timeIntervalSince(armed) < Self.doctorArmSeconds { return true }
        try? FileManager.default.removeItem(atPath: doctorArmPath)
        options.log("doctor: an arm older than \(Int(Self.doctorArmSeconds / 60)) minutes, removed")
        return false
    }
}
