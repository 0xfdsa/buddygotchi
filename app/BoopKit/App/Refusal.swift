import Foundation

/// Why a change was refused: a bad name at setup, or a hook the installer
/// won't touch. For the log or the person, so its `localizedDescription`
/// is these words too.
public struct Refusal: LocalizedError, Equatable, CustomStringConvertible {
    public var description: String
    public init(_ description: String) { self.description = description }
    public var errorDescription: String? { description }
}
